package interview.guide.modules.jobagent;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.time.Duration;

/**
 * 求职投递 Agent 桥接配置。
 */
@Component
@ConfigurationProperties(prefix = "app.job-agent")
public class JobAgentProperties {

    private boolean enabled = true;
    private String host = "127.0.0.1";
    private int port = 8686;
    private String baseDir = "job-agent";
    private String pythonPath = "python";
    private Duration healthCheckInterval = Duration.ofSeconds(2);
    private Duration healthCheckTimeout = Duration.ofSeconds(3);
    private Duration startupTimeout = Duration.ofSeconds(30);

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getBaseDir() {
        return baseDir;
    }

    public void setBaseDir(String baseDir) {
        this.baseDir = baseDir;
    }

    public String getPythonPath() {
        return pythonPath;
    }

    public void setPythonPath(String pythonPath) {
        this.pythonPath = pythonPath;
    }

    public Duration getHealthCheckInterval() {
        return healthCheckInterval;
    }

    public void setHealthCheckInterval(Duration healthCheckInterval) {
        this.healthCheckInterval = healthCheckInterval;
    }

    public Duration getHealthCheckTimeout() {
        return healthCheckTimeout;
    }

    public void setHealthCheckTimeout(Duration healthCheckTimeout) {
        this.healthCheckTimeout = healthCheckTimeout;
    }

    public Duration getStartupTimeout() {
        return startupTimeout;
    }

    public void setStartupTimeout(Duration startupTimeout) {
        this.startupTimeout = startupTimeout;
    }

    public String getBaseDirAbsolute() {
        return Path.of(baseDir).toAbsolutePath().normalize().toString();
    }
}
