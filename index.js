import express from 'express';
import bodyParser from 'body-parser';
import {auth, JWT} from 'google-auth-library';
import fs from 'fs';
// const { google } = pkg;

const app = express();
const PORT = 3000;

// Load service account key
import serviceAccount from './service-account.json' with { type: 'json' };
const projectId = serviceAccount.project_id;

// Parse JSON request body
app.use(express.json());


// Route: /send-notification
app.post('/send-notification', async (req, res) => {
    var data = req.body;
    if (data == undefined) {
        return res.status(400).send({ error: 'Dữ liệu không hợp lệ' });
    }

    if (!data.token || !data.title || !data.body) {
        return res.status(400).send({ error: 'Thiếu trường bắt buộc' });
    }


    try {
        const client = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });

        // const auth = new googleAuth.GoogleAuth({
        //     credentials: serviceAccount,
        //     scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        // });

        // const accessToken = await auth.getAccessToken();
        // const projectId = await auth.getProjectId();


        // Compose notification payload
        const payload = {
            message: {
                token: data.token,
                notification: {
                    title: data.title,
                    body: data.body,
                },
                data: {
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                },
            },
        };

        // Send FCM request
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken.token}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        res.status(200).send({
            status: 'sent',
            fcmResponse: result,
        });
    } catch (error) {
        console.error('Lỗi gửi FCM:', error);
        res.status(500).send({ error: error.message });
    }
});

// Get route to check server status
app.get('/test', (req, res) => {
    res.send('🚀 API server đang chạy!');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API server đang chạy tại http://localhost:${PORT}`);
});
