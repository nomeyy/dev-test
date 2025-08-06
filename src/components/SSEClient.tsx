'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Container,
    Divider,
    Paper,
    Snackbar,
    Stack,
    TextField,
    ThemeProvider,
    Typography,
    CssBaseline,
    createTheme,
    useTheme,
    Alert,
} from '@mui/material';
import type { LogEntry } from '../hooks/sse';
import { useSSE } from '../hooks/sse';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#121212',
            paper: '#1E1E1E',
        },
    },
});

function timeAgo(dateStr: string): string {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function NotificationPanel() {
    const [userId, setUserId] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const logs = useSSE(userId);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let savedId = localStorage.getItem('userId');
        if (!savedId) {
            savedId = crypto.randomUUID();
            localStorage.setItem('userId', savedId);
        }
        setUserId(savedId);
    }, []);

    const showSnackbar = (message: string) => {
        setSnackbarMsg(message);
        setSnackbarOpen(true);
    };

    const sendMessage = async () => {
        if (!customMessage.trim()) return;

        await fetch('/api/notify', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                event: 'notification',
                payload: { message: customMessage },
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        setCustomMessage('');
        showSnackbar('Custom message sent!');
    };

    const sendServerNotification = async () => {
        await fetch('/api/notify', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                event: 'notification',
                payload: { message: 'This is a server notification' },
            }),
            headers: { 'Content-Type': 'application/json' },
        });
        showSnackbar('Server notification sent!');
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Container maxWidth="md" sx={{ py: 6 }}>
                <Card elevation={4}>
                    <CardHeader
                        title="Real-Time Notification Panel"
                        subheader={`Connected as ${userId || '...'}`}
                        sx={{
                            textAlign: 'center',
                            backgroundColor: darkTheme.palette.background.paper,
                            color: darkTheme.palette.text.primary,
                        }}
                    />
                    <Divider />
                    <CardContent>
                        <Stack spacing={3}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    fullWidth
                                    placeholder="Enter a custom message"
                                    variant="outlined"
                                    size="small"
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={sendMessage}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    Send
                                </Button>
                            </Stack>

                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={sendServerNotification}
                                fullWidth
                            >
                                Send Server Notification
                            </Button>

                            <Paper
                                variant="outlined"
                                sx={{
                                    maxHeight: 350,
                                    overflowY: 'auto',
                                    bgcolor: darkTheme.palette.background.paper,
                                    px: 2,
                                    py: 1,
                                    fontFamily: 'monospace',
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        position: 'sticky',
                                        top: 0,
                                        bgcolor: darkTheme.palette.background.paper,
                                        py: 0.5,
                                        borderBottom: `1px solid ${darkTheme.palette.divider}`,
                                    }}
                                >
                                    Logs
                                </Typography>
                                <Divider sx={{ mb: 1 }} />
                                <div ref={logsEndRef} />

                                {logs.length === 0 ? (
                                    <Typography
                                        align="center"
                                        color="text.secondary"
                                        fontStyle="italic"
                                        sx={{ py: 2 }}
                                    >
                                        No messages received yet.
                                    </Typography>
                                ) : (
                                    logs.map((log: LogEntry, index: number) => (
                                        <Box
                                            key={index}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            py={0.5}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color:
                                                        log.type === 'heartbeat'
                                                            ? darkTheme.palette.info.main
                                                            : log.type === 'notification'
                                                                ? darkTheme.palette.success.main
                                                                : darkTheme.palette.text.secondary,
                                                }}
                                            >
                                                [{timeAgo(log.timestamp)}] {log.type.toUpperCase()}:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    ml: 2,
                                                    textAlign: 'right',
                                                    flex: 1,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {log.content}
                                            </Typography>
                                        </Box>
                                    ))
                                )}
                            </Paper>
                        </Stack>
                    </CardContent>
                </Card>
                
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={3000}
                    onClose={() => setSnackbarOpen(false)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert onClose={() => setSnackbarOpen(false)} severity="success" variant="filled">
                        {snackbarMsg}
                    </Alert>
                </Snackbar>
            </Container>
        </ThemeProvider>
    );
}
