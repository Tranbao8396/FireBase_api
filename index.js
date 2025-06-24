import express from 'express';
import bodyParser from 'body-parser';
import {auth, JWT} from 'google-auth-library';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// const { google } = pkg;

const app = express();
const PORT = 3000;

// Load service account key
import serviceAccount from './service-account.json' with { type: 'json' };
const projectId = serviceAccount.project_id;

// Parse JSON request body
app.use(express.json());
app.use(cors());
// Add this line to serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Prepare to handle file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

// Route: /upload
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('không có file uploaded.');
  res.json({
    message: 'Image uploaded thành công!',
    filePath: `uploads/${req.file.filename}`,
    imageUrl: `http://10.0.2.2:${PORT}/uploads/${req.file.filename}`,
  });
});



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

        await client.authorize();
        const accessToken = await auth.getAccessToken(client);
        if (!accessToken) {
            return res.status(500).send({ error: 'Không thể lấy access token' });
        }
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
                Authorization: `Bearer ${accessToken}`,
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
