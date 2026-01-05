package com.example.WebRemote.Config;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MqttConfig {

    private static final String BROKER_URL = "tcp://yadiec2.freedynamicdns.net:1883";  // or private IP if in same VPC
    private static final String CLIENT_ID = "spring-boot-backend";

    @Bean
    public MqttClient mqttClient() throws MqttException {
        MqttClient client = new MqttClient(BROKER_URL, CLIENT_ID);
        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        options.setConnectionTimeout(10);

        // If you enable authentication on Mosquitto later:
        // options.setUserName("username");
        // options.setPassword("password".toCharArray());

        client.connect(options);
        return client;
    }
}