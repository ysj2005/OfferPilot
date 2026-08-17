package interview.guide.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class SimpleVectorStoreConfig {

  @Bean
  public VectorStore vectorStore(EmbeddingModel embeddingModel) {
    log.info("Initializing in-memory SimpleVectorStore (pgvector not available)");
    return SimpleVectorStore.builder(embeddingModel).build();
  }
}
