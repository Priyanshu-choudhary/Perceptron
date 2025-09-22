package com.example.WebRemote.Component;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.ByteBuffer;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketHandler extends AbstractWebSocketHandler {

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();
    private final Map<String, String> sessionRoles = new ConcurrentHashMap<>(); // sessionId -> role
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
//        System.out.println("Received text message from session: " + session.getId());

        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);

            // Handle role identification (signaling)
            if (data.containsKey("role")) {
                String role = (String) data.get("role");
                sessionRoles.put(session.getId(), role);
//                System.out.println("Session " + session.getId() + " registered as: " + role);
                return;
            }

            // Relay signaling messages based on role
            String senderRole = sessionRoles.get(session.getId());
            if (senderRole != null) {
                for (WebSocketSession otherSession : sessions) {
                    if (otherSession != session && otherSession.isOpen()) {
                        String otherRole = sessionRoles.get(otherSession.getId());
                        // Only send to opposite role (pi <-> browser)
                        if (otherRole != null && !otherRole.equals(senderRole)) {
//                            System.out.println("Relaying text from " + senderRole + " to " + otherRole);
                            otherSession.sendMessage(new TextMessage(payload));
                        }
                    }
                }
            }

        } catch (Exception e) {
            System.err.println("Error processing text message: " + e.getMessage());
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        ByteBuffer buffer = message.getPayload();
//        System.out.println("Received binary message from session: " + session.getId());

        String senderRole = sessionRoles.get(session.getId());
        if (senderRole != null) {
            for (WebSocketSession otherSession : sessions) {
                if (otherSession != session && otherSession.isOpen()) {
                    String otherRole = sessionRoles.get(otherSession.getId());
                    // Only send to opposite role (pi <-> browser)
                    if (otherRole != null && !otherRole.equals(senderRole)) {
//                        System.out.println("Relaying binary from " + senderRole + " to " + otherRole);
                        otherSession.sendMessage(new BinaryMessage(buffer.duplicate(), true));
                    }
                }
            }
        } else {
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