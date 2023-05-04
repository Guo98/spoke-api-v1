import { Router } from "express";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

const router = Router();

router.get("/documents", async (req, res) => {
  let blobNames = [];
  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (!accountName) throw new Error("Azure Storage accountName not found");

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );

    const containerClient = blobServiceClient.getContainerClient("images");

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

export default router;
