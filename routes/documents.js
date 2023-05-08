import { Router } from "express";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { checkJwt } from "../services/auth0.js";

const router = Router();

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
      new DefaultAzureCredential()
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

router.get("/downloaddoc", async (req, res) => {
  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (!accountName) throw new Error("Azure Storage accountName not found");

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );

    const containerClient = blobServiceClient.getContainerClient("quotes");

    const blockBlobClient = await containerClient.getBlockBlobClient(
      "testing.pdf"
    );

    const downloadBlockBlobResponse = await blockBlobClient.download();

    const downloaded = await streamToBuffer(
      downloadBlockBlobResponse.readableStreamBody
    );
    res.send({ status: "Success", byteStream: downloaded });
    console.log("/downloadDoc => Download document response: ", downloaded);
  } catch (e) {
    console.log(`/downloadDoc => Error in downloading document.`);
    res.status(500).json({ status: "Error in downloading" });
  }

  if (!res.headersSent) res.send({ status: "Success" });
});

router.post("/uploadDoc", checkJwt, async (req, res) => {});

export default router;
