//import couchbase from "couchbase";

async function getAdminLogin(body) {
  // const { auth } = body;
  // const credentials = Buffer.from(auth, "base64").toString("ascii");
  // const [username, password] = credentials.split(":");
  // const clusterConnStr = "couchbases://cb.whdgkxpkpv8abdyk.cloud.couchbase.com";
  // const dbUsername = "testuser";
  // const dbPassword = "Password123$";
  // const bucketname = "travel-sample";
  // try {
  //   const cluster = await couchbase.connect(clusterConnStr, {
  //     username: dbUsername,
  //     password: dbPassword,
  //     timeouts: {
  //       kvTimeout: 10000
  //     }
  //   });
  //   const bucket = cluster.bucket(bucketname);
  //   const collection = bucket.scope("login").collection("admin");
  //   let getResult = await collection.get("admin-1");
  //   console.log("get result :::::::: ", getResult);
  //   return getResult;
  // } catch (e) {
  //   console.log("error waiting ::::::::", e);
  // }
}

export { getAdminLogin };
