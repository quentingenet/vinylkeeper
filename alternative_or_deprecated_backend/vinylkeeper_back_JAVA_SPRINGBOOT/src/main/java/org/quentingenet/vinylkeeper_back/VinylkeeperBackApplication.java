package org.quentingenet.vinylkeeper_back;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "org.quentingenet.vinylkeeper_back.repository")
@EntityScan(basePackages = "org.quentingenet.vinylkeeper_back.model")
public class VinylkeeperBackApplication {

	public static void main(String[] args) {
		// Set the active profile to local by default : to remove in prod...
		// This is used to load the local properties file
		System.setProperty("spring.profiles.active", "local");
		SpringApplication.run(VinylkeeperBackApplication.class, args);
	}

}
