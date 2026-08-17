package interview.guide.modules.jobagent;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.jobagent.model.JobAgentStatusDTO;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

/**
 * BossHunter 子进程生命周期管理。
 */
@Slf4j
@Component
public class JobAgentProcessManager {

    private static final int MAX_LOG_LINES = 200;
    private static final Duration STOP_WAIT = Duration.ofSeconds(5);

    private final JobAgentProperties properties;
    private final JobAgentClient client;
    private final Deque<String> logs = new ArrayDeque<>();

    private volatile Process process;
    private volatile String state = "STOPPED";
    private volatile String message = "Agent 尚未启动";
    private int consecutiveHealthFailures = 0;

    public JobAgentProcessManager(JobAgentProperties properties, JobAgentClient client) {
        this.properties = properties;
        this.client = client;
    }

    public synchronized void ensureStarted() {
        if (!properties.isEnabled()) {
            throw new BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE, "求职投递 Agent 已在配置中禁用");
        }
        Process current = process;
        if (current != null && current.isAlive()) {
            if (client.isHealthy()) {
                consecutiveHealthFailures = 0;
                return;
            }
            consecutiveHealthFailures++;
            if (consecutiveHealthFailures >= 3) {
                log.warn("求职投递 Agent 连续 {} 次健康检查失败，准备重启", consecutiveHealthFailures);
                consecutiveHealthFailures = 0;
                stopProcess();
                startProcess();
            } else {
                log.warn("求职投递 Agent 健康检查失败（第 {} 次），暂不重启", consecutiveHealthFailures);
            }
            return;
        }
        consecutiveHealthFailures = 0;
        startProcess();
    }

    public synchronized JobAgentStatusDTO start() {
        if (!properties.isEnabled()) {
            throw new BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE, "求职投递 Agent 已在配置中禁用");
        }
        Process current = process;
        if (current != null && current.isAlive() && client.isHealthy()) {
            return status();
        }
        stopProcess();
        startProcess();
        return status();
    }

    public synchronized JobAgentStatusDTO stop() {
        stopProcess();
        return status();
    }

    public JobAgentStatusDTO status() {
        if (!properties.isEnabled()) {
            return new JobAgentStatusDTO("DISABLED", false, "求职投递 Agent 已在配置中禁用", null, List.copyOf(logs));
        }
        Process current = process;
        if (current != null && current.isAlive()) {
            boolean healthy = client.isHealthy();
            return new JobAgentStatusDTO(
                "RUNNING",
                healthy,
                healthy ? "Agent 运行中" : "Agent 进程存在但健康检查未通过",
                current.pid(),
                List.copyOf(logs)
            );
        }
        return new JobAgentStatusDTO(
            "STARTING".equals(state) ? "STARTING" : "STOPPED",
            false,
            message,
            null,
            List.copyOf(logs)
        );
    }

    @PreDestroy
    public synchronized void shutdown() {
        stopProcess();
    }

    private void startProcess() {
        Path baseDir = Path.of(properties.getBaseDirAbsolute());
        if (!Files.isDirectory(baseDir) || !Files.isDirectory(baseDir.resolve("src").resolve("bosshunter"))) {
            String detail = "目录不存在或缺少 src/bosshunter：" + baseDir;
            appendLog(detail);
            state = "ERROR";
            message = detail;
            throw new BusinessException(ErrorCode.JOB_AGENT_START_FAILED, detail);
        }

        List<String> command = List.of(
            properties.getPythonPath(),
            "-m",
            "bosshunter.main",
            "--config",
            "config.yaml",
            "web",
            "--no-open",
            "--port",
            String.valueOf(properties.getPort())
        );
        ProcessBuilder builder = new ProcessBuilder(command);
        builder.directory(baseDir.toFile());
        builder.redirectErrorStream(true);
        String existingPythonPath = builder.environment().get("PYTHONPATH");
        builder.environment().put(
            "PYTHONPATH",
            existingPythonPath == null || existingPythonPath.isBlank()
                ? "src"
                : "src" + File.pathSeparator + existingPythonPath
        );

        try {
            state = "STARTING";
            message = "正在启动求职投递 Agent";
            appendLog("启动命令：" + String.join(" ", command));
            process = builder.start();
            startOutputReader(process);
            waitUntilHealthy(process);
            state = "RUNNING";
            message = "Agent 运行中";
        } catch (IOException e) {
            String detail = "无法启动 Python 进程，请确认已安装 Python 3.10+：" + e.getMessage();
            appendLog(detail);
            state = "ERROR";
            message = detail;
            throw new BusinessException(ErrorCode.JOB_AGENT_START_FAILED, detail);
        }
    }

    private void startOutputReader(Process started) {
        Thread reader = new Thread(() -> {
            try (BufferedReader reader0 = new BufferedReader(
                new InputStreamReader(started.getInputStream(), StandardCharsets.UTF_8)
            )) {
                String line;
                while ((line = reader0.readLine()) != null) {
                    appendLog(line);
                }
            } catch (IOException e) {
                if (started.isAlive()) {
                    appendLog("读取 Agent 输出失败：" + e.getMessage());
                }
            }
        }, "job-agent-output");
        reader.setDaemon(true);
        reader.start();
    }

    private void waitUntilHealthy(Process started) {
        Instant deadline = Instant.now().plus(properties.getStartupTimeout());
        while (Instant.now().isBefore(deadline)) {
            if (!started.isAlive()) {
                String detail = "Agent 进程提前退出，请确认 job-agent 依赖已安装（pip install -e job-agent）";
                appendLog(detail);
                state = "ERROR";
                message = detail;
                throw new BusinessException(ErrorCode.JOB_AGENT_START_FAILED, detail);
            }
            if (client.isHealthy()) {
                return;
            }
            try {
                Thread.sleep(properties.getHealthCheckInterval().toMillis());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        String detail = "Agent 启动超时，请检查 127.0.0.1:" + properties.getPort() + " 是否被其他进程占用";
        appendLog(detail);
        started.destroy();
        state = "ERROR";
        message = detail;
        throw new BusinessException(ErrorCode.JOB_AGENT_START_FAILED, detail);
    }

    private void stopProcess() {
        Process current = process;
        if (current == null) {
            state = "STOPPED";
            message = "Agent 已停止";
            return;
        }
        if (current.isAlive()) {
            appendLog("正在停止 Agent");
            current.destroy();
            try {
                if (!current.waitFor(STOP_WAIT.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)) {
                    current.destroyForcibly();
                    current.waitFor(STOP_WAIT.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        process = null;
        state = "STOPPED";
        message = "Agent 已停止";
    }

    private void appendLog(String line) {
        if (line == null || line.isBlank()) {
            return;
        }
        synchronized (logs) {
            logs.addLast(line);
            while (logs.size() > MAX_LOG_LINES) {
                logs.removeFirst();
            }
        }
    }
}
