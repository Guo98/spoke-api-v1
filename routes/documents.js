import { Router } from "express";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import multer from "multer";
import { checkJwt } from "../services/auth0.js";
import { updateMarketplaceFile } from "./orders.js";

const router = Router();

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    console.log("file :::::::::: ", file);
    cb(null, file.originalname);
  },
});

const upload = multer();

async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

router.get("/documents", checkJwt, async (req, res) => {
  let blobNames = [];
  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (!accountName) throw new Error("Azure Storage accountName not found");

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new DefaultAzureCredential({
        tenantId: "9b9f4cee-fe96-4873-8081-83787efec6ee",
      })
    );

    const containerClient = blobServiceClient.getContainerClient("quotes");

    for await (const blob of containerClient.listBlobsFlat()) {
      //const tempBlockBlobClient = containerClient.getBlockBlobClient(blob.name);
      console.log("blob name ::::::::::: ", blob.name);
      blobNames.push(blob.name);
    }
  } catch (e) {
    console.log("error in here :::::::::: ", e);
  }

  res.send({ status: "Hello World", blobNames: blobNames });
});

router.get("/downloaddoc/:filename", async (req, res) => {
  const filename = req.params.filename;
  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (!accountName) throw new Error("Azure Storage accountName not found");

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new DefaultAzureCredential({})
    );

    const containerClient = blobServiceClient.getContainerClient("quotes");

    const blockBlobClient = await containerClient.getBlockBlobClient(filename);

    const downloadBlockBlobResponse = await blockBlobClient.download();

    const downloaded = await streamToBuffer(
      downloadBlockBlobResponse.readableStreamBody
    );
    res.send({ status: "Success", byteStream: downloaded });
    console.log("/downloadDoc => Download document response: ", downloaded);
  } catch (e) {
    console.log(`/downloadDoc => Error in downloading document.`, e);
    res.status(500).json({ status: "Error in downloading" });
  }

  if (!res.headersSent) res.send({ status: "Success" });
});

router.post(
  "/uploadDoc",
  [checkJwt, upload.single("file")],
  async (req, res) => {
    try {
      const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
      if (!accountName) throw new Error("Azure Storage accountName not found");

      const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        new DefaultAzureCredential({
          tenantId: "9b9f4cee-fe96-4873-8081-83787efec6ee",
        })
      );

      const containerClient = blobServiceClient.getContainerClient("quotes");

      const blockBlobClient = await containerClient.getBlockBlobClient(
        req.file.originalname
      );

      await blockBlobClient.uploadData(req.file.buffer);
    } catch (e) {
      console.log("/uploadDoc => Error in uploading document: ", e);
      res.status(500).json({ status: "Error in uploading doc" });
    }

    try {
      console.log(
        `/uploadDoc => Updating market order with filepath: `,
        req.body
      );
      await updateMarketplaceFile(
        req.body.order_id,
        req.body.client,
        req.file.originalname
      );
    } catch (e) {
      console.log("/uploadDoc => Error in updating db: ", e);
      res.status(500).json({ status: "Error in updating db" });
    }
    if (!res.headersSent) res.send({ status: "Success" });
  }
);

export default router;
