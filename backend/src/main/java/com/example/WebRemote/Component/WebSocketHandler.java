package com.example.WebRemote.Component;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketHandler extends AbstractWebSocketHandler {

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();
    private final Map<String, String> sessionRoles = new ConcurrentHashMap<>(); // sessionId -> role
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MqttClient mqttClient;  // Injected bean


    public void broadcastData(byte[] data) {
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    // We simply send the binary data to everyone connected
                    // You can add logic here to filter by role (e.g., only send to "browser" role)
                    // Note: Creating a new BinaryMessage for each send is safer for buffer management
                    session.sendMessage(new BinaryMessage(data));
                } catch (IOException e) {
                    System.err.println("Error broadcasting to session " + session.getId() + ": " + e.getMessage());
                }
            }
        }
    }
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        System.out.println("Received from frontend: " + payload);

        try {
            // Optional: Validate or extract specific data
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);

            // Convert back to JSON string (or customize as needed)
            String jsonPayload = objectMapper.writeValueAsString(data);

            // Publish to MQTT topic
            MqttMessage mqttMessage = new MqttMessage(jsonPayload.getBytes());
            mqttMessage.setQos(1);  // At least once delivery
            mqttMessage.setRetained(false);  // Set true if you want last known value retained

            mqttClient.publish("/perceptron/config", mqttMessage);

            System.out.println("Published to MQTT topic /perceptron/config: " + jsonPayload);

            // Optional: Send confirmation back to frontend
            session.sendMessage(new TextMessage("Config sent to Jetson successfully"));

        } catch (Exception e) {
            System.err.println("Error forwarding to MQTT: " + e.getMessage());
            e.printStackTrace();
            // Optional: Send error back to frontend
            session.sendMessage(new TextMessage("Failed to send config: " + e.getMessage()));
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        ByteBuffer buffer = message.getPayload();
//        System.out.println("Received binary message from session: " + session.getId());

        String senderRole = sessionRoles.get(session.getId());
        // inside handleBinaryMessage
// ...
        if (senderRole != null) {
            for (WebSocketSession otherSession : sessions) {
                if (otherSession != session) {
                    String otherRole = sessionRoles.get(otherSession.getId());
                    if (otherRole != null && !otherRole.equals(senderRole)) {
                        // ADDED ROBUSTNESS CHECK AND ERROR HANDLING
                        if (otherSession.isOpen()) {
                            try {
                                otherSession.sendMessage(new BinaryMessage(buffer.duplicate(), true));
                            } catch (IOException e) {
                                System.err.println("Error sending message to session " + otherSession.getId() + ": " + e.getMessage());
                                // Optional: Close the session if a send error occurs to clean it up
                                if (e.getMessage().contains("Connection reset by peer")) {
                                    otherSession.close(); // Triggers afterConnectionClosed for cleanup
                                }
                            }
                        }
                    }
                }
            }
        }
// ... rest of the method

         else {
            // Fallback: if no role is set, broadcast to all (like old behavior)
            for (WebSocketSession otherSession : sessions) {
                if (otherSession != session && otherSession.isOpen()) {
                    otherSession.sendMessage(new BinaryMessage(buffer.duplicate(), true));
                }
            }
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
//        System.out.println("New connection: " + session.getId() + ", Total sessions: " + sessions.size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        sessions.remove(session);
        sessionRoles.remove(session.getId());
//        System.out.println("Connection closed: " + session.getId() + ", Remaining sessions: " + sessions.size());
    }
}