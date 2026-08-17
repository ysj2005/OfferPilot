package interview.guide.modules.jobagent;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JobAgentProperties 测试")
class JobAgentPropertiesTest {

    @Test
    @DisplayName("默认配置可解析绝对 base-dir")
    void defaultPropertiesResolveBaseDir() {
        JobAgentProperties properties = new JobAgentProperties();

        assertThat(properties.isEnabled()).isTrue();
        assertThat(properties.getPort()).isEqualTo(8686);
        assertThat(properties.getPythonPath()).isEqualTo("python");
        assertThat(properties.getStartupTimeout()).isEqualTo(Duration.ofSeconds(30));
        assertThat(Path.of(properties.getBaseDirAbsolute())).isAbsolute();
    }

    @Test
    @DisplayName("修改配置后属性生效")
    void customPropertiesTakeEffect() {
        JobAgentProperties properties = new JobAgentProperties();
        properties.setEnabled(false);
        properties.setPort(9999);
        properties.setPythonPath("py");

        assertThat(properties.isEnabled()).isFalse();
        assertThat(properties.getPort()).isEqualTo(9999);
        assertThat(properties.getPythonPath()).isEqualTo("py");
    }
}
