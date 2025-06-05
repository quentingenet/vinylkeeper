package org.quentingenet.vinylkeeper_back.security.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Configuration
public class RsaKeyConfig {

    @Value("${rsa.private-key}")
    private String privateKeyPath;

    @Value("${rsa.public-key}")
    private String publicKeyPath;

    @Bean
    public RSAPublicKey publicKey() throws Exception {
        String publicKeyContent = Files.readString(Paths.get(publicKeyPath));
        
        KeyFactory kf = KeyFactory.getInstance("RSA");
        X509EncodedKeySpec publicSpec = new X509EncodedKeySpec(
                Base64.getDecoder().decode(
                        publicKeyContent
                                .replace("-----BEGIN PUBLIC KEY-----", "")
                                .replace("-----END PUBLIC KEY-----", "")
                                .replaceAll("\\s", "")
                )
        );
        return (RSAPublicKey) kf.generatePublic(publicSpec);
    }

    @Bean
    public RSAPrivateKey privateKey() throws Exception {
        String privateKeyContent = Files.readString(Paths.get(privateKeyPath));
        
        KeyFactory kf = KeyFactory.getInstance("RSA");
        PKCS8EncodedKeySpec privateSpec = new PKCS8EncodedKeySpec(
                Base64.getDecoder().decode(
                        privateKeyContent
                                .replace("-----BEGIN PRIVATE KEY-----", "")
                                .replace("-----END PRIVATE KEY-----", "")
                                .replaceAll("\\s", "")
                )
        );
        return (RSAPrivateKey) kf.generatePrivate(privateSpec);
    }
}