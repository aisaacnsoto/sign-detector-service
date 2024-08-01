require('dotenv').config();

const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { initializeApp } = require("firebase/app");
const { getStorage, ref, getDownloadURL, uploadBytesResumable, uploadBytes } = require("firebase/storage");

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_RENDER_ID,
    appId: process.env.APP_ID
};

initializeApp(firebaseConfig);
const storage = getStorage();

app.post('/upload_model', upload.fields([{ name: 'model.json' }, { name: 'model.weights.bin' }]), async (req, res) => {
    try {
        if (req.files['model.json'] && req.files['model.json'][0]) {
            let file = req.files['model.json'][0];
            let metadata = { contentType: file.mimetype };

            let storageRef = ref(storage, "model.json");
            await uploadBytesResumable(storageRef, file.buffer, metadata);
        }
        if (req.files['model.weights.bin'] && req.files['model.weights.bin'][0]) {
            let file = req.files['model.weights.bin'][0];
            let metadata = { contentType: file.mimetype };

            let storageRef = ref(storage, "model.weights.bin");
            await uploadBytesResumable(storageRef, file.buffer, metadata);
        }
        res.json({
            message: 'Archivos subidos correctamente'
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message: 'No se pudo almacenar el modelo.',
            code: 400
        });
    }

});

app.post('/upload_dataset', async (req, res) => {
    try {
        let path = req.body.path;
        let jsonBlob = new Blob([req.body.json], { type: 'application/json' });
        
        let metadata = { contentType: 'application/json' };

        let storageRef = ref(storage, path);
        await uploadBytes(storageRef, jsonBlob, metadata);

        res.json({
            message: 'Dataset subido correctamente'
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message: 'No se pudo almacenar el modelo.',
            code: 400
        });
    }

});

app.get('/getfile', async (req, res) => {
    try {
        let path = req.query.path;
        const storageRef = ref(storage, path);
        const downloadURL = await getDownloadURL(storageRef);

        res.json({
            message: 'Archivos subidos correctamente',
            download_url: downloadURL
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message: 'No se pudo obtener el objeto.',
            code: 400
        });
    }

});

// Iniciar el servidor
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Servidor ejecutándose en puerto ${port}`);
});
