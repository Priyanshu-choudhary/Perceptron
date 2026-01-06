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
        boolean isMqttMessage = false;

        try {
            // Parse JSON to check for the MQTT type
            com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(payload);

            if (rootNode.has("type") && "MQTT".equals(rootNode.get("type").asText())) {
                isMqttMessage = true;

                // 1. FORWARD TO MQTT
                MqttMessage mqttMessage = new MqttMessage(payload.getBytes());
                mqttMessage.setQos(1);
                mqttClient.publish("/perceptron/config", mqttMessage);
                System.out.println("MQTT message forwarded.");

                // Note: We do NOT send a "Success" message back to avoid unwanted traffic
            }
        } catch (Exception e) {
            // Not a JSON or doesn't have "type", so it's a normal text message
            isMqttMessage = false;
        }

        // 2. BROADCAST TO OTHERS (Only if NOT an MQTT message)
        if (!isMqttMessage) {
            String senderId = session.getId();
            String senderRole = sessionRoles.get(senderId);

            for (WebSocketSession s : sessions) {
                // CRITICAL: Check s.getId() is NOT the senderId
                if (s.isOpen() && !s.getId().equals(senderId)) {

                    String targetRole = sessionRoles.get(s.getId());

                    // Optional: Your role-based filtering
                    if (senderRole != null && targetRole != null) {
                        if (!senderRole.equals(targetRole)) {
                            s.sendMessage(message);
                        }
                    } else {
                        // Default broadcast to everyone else
                        s.sendMessage(message);
                    }
                }
            }
        }
    }

    // Helper method to broadcast text messages (mirrors your binary logic)
    private void broadcastTextMessage(WebSocketSession sender, TextMessage message) {
        String senderRole = sessionRoles.get(sender.getId());

        for (WebSocketSession s : sessions) {
            // Don't send back to the sender
            if (s.isOpen() && !s.getId().equals(sender.getId())) {
                try {
                    String targetRole = sessionRoles.get(s.getId());
                    // Apply your role filtering if roles are set
                    if (senderRole != null && targetRole != null) {
                        if (!senderRole.equals(targetRole)) {
                            s.sendMessage(message);
                        }
                    } else {
                        // Fallback: broadcast to everyone else if no roles are defined
                        s.sendMessage(message);
                    }
                } catch (IOException e) {
                    System.err.println("Error broadcasting text to " + s.getId() + ": " + e.getMessage());
                }
            }
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