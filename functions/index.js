require('dotenv').config();

const express = require('express');
const {Router} = require('express');
const serverless = require('serverless-http');
// import express, { Router } from "express";
//import serverless from "serverless-http";
const api = express();
const router = Router();

const cors = require('cors');
api.use(cors());

api.use(express.json({ limit: '50mb' }));
api.use(express.urlencoded({ extended: true, limit: '50mb' }));

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { initializeApp } = require("firebase/app");
const { getStorage, ref, getDownloadURL, uploadBytesResumable, uploadBytes } = require("firebase/storage");
const { getFirestore, collection, addDoc, getDocs, query } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_RENDER_ID,
    appId: process.env.APP_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage();
const db = getFirestore(app);

router.post('/upload_model', upload.fields([{ name: 'model.json' }, { name: 'model.weights.bin' }]), async (req, res) => {
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

router.post('/upload_dataset', async (req, res) => {
    try {
        let path = req.body.path;
        let nombre_archivo = req.body.nombre_archivo;
        let jsonBlob = new Blob([req.body.json], { type: 'application/json' });
        
        let metadata = { contentType: 'application/json' };

        let storageRef = ref(storage, path);
        await uploadBytes(storageRef, jsonBlob, metadata);

        const downloadURL = await getDownloadURL(storageRef);

        if (nombre_archivo) {
            const docRef = await addDoc(collection(db, "datasets"), {
                nombre: nombre_archivo,
                url: downloadURL,
            });
        }

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

router.get('/getfile', async (req, res) => {
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

router.get('/prueba', async(req, res) => {
    res.json({
        message: 'Prueba exitosa'
    });
});

/*router.get('/save-doc', async(req, res) => {
    try {
        const docRef = await addDoc(collection(db, "datasets"), {
            nombre: "el nombre",
            url: "el url",
        });
        console.log("Document written with ID: ", docRef.id);
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    res.json({
        message: 'Prueba exitosa'
    });
});*/

router.get('/list-docs', async(req, res) => {
    const q = query(collection(db, "datasets"));
    const querySnapshot = await getDocs(q);
    let urls = [];
    querySnapshot.forEach((doc) => {
        let data = doc.data();
        urls.push(data.url);
    });
    res.json({
        message: 'Se ha recuperado correctamente los datos.',
        urls
    });
});

api.use("/.netlify/functions/index", router);

// Iniciar el servidor
/*const port = process.env.PORT;
api.listen(port, () => {
  console.log(`Servidor ejecutándose en puerto ${port}`);
});*/
module.exports.handler = serverless(api);