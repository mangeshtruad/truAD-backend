import express from "express";
import bodyParser from "body-parser";
import Login from "./controller/login.js";
import Confirm from "./controller/confirm.js";
import Register from "./controller/register.js";
import VerifyOTP from "./controller/verifyOTP.js";
import verifyToken from "./middleware/verifyToken.js";
import mongodb from "./database/mongo.js";
import cors from "cors";
import path, { dirname } from "path";
import fs from "fs";
import Items from "./database/mongo-schema-items.js";
import { fileURLToPath } from "url";
import Video from "./database/mongo_schema_video.js";
import ivideoClip from "./controller/ivideoclip.js";
import Media from "./database/mongo_schema_media.js";
import Notification from "./database/mongo_schema_notification.js"
import Band from "./database/mongo_schema_band.js"
import mongoose from "mongoose";
import VideoClip from "./controller/videoclip.js";
import ForgotPassword from "./controller/forgotPassword.js";
import ResetPassword from "./controller/resetPassword.js";
import UploadMaterial from "./controller/uploadMaterial.js";
import Material from "./database/mongo_schema_material.js";
import jwt from "jsonwebtoken";
import DeleteMaterial from "./controller/deleteMaterial.js";
// import User from "./routes/User_route.js";
import User from "./database/mongo_schemar.js"
import raiseTicket from "./routes/RaiseTicket.js";
import { MongoClient } from "mongodb";
import GetMaterial from "./controller/getMaterial.js";
import upload from "./middleware/fileupload.js";
import aws from "aws-sdk"
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);

const ObjectId = mongoose.Types.ObjectId;

aws.config.update({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.ACCESS_SECRET,
  region: process.env.REGION
})

const s3 = new aws.S3()


const storage = multer.memoryStorage();
const uploader = multer({ storage: storage });

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
mongodb();

app.get("/", (req, res) => {
  res.send("Hello From Server");
});

app.use("/api/user", User);
app.use("/api/ticket", raiseTicket);
app.post("/api/register", Register);

app.post("/api/login", Login);

app.get("/api/confirm", Confirm);

app.post("/api/forgot", ForgotPassword);

app.post("/verifyOtp", VerifyOTP);

app.post("/resetPassword", verifyToken, ResetPassword);

app.post("/api/videoclip", VideoClip);

app.post("/api/uploadMaterial", verifyToken, uploader.single("file"),UploadMaterial);

app.post("/api/deleteMaterial", DeleteMaterial);
app.get("/api/getMaterial", GetMaterial);

app.post("/add-media", async (req, res) => {
  const data = JSON.parse(req.body.data);
  const file = req.files.video;
  const clipDuration = Number(req.body.clipsDur);

  // console.log(data);

  const newMedia = new Media({
    name: data.Name,
    type: data.Type,
    poster: data.poster,
    duration: data.Duration,
    availableAdClips: data["Available Ad Clips"],
    starring: data.Starring,
    releaseDate: data["Release Date"],
    noOfEpisodes: data["No of Episodes"],
    season: data.Season,
    category: data.Category,
    certification: data.Certification,
    mediaLocation: "",
  });

  const saveData = await newMedia.save();

  const vidData = await ivideoClip(file, clipDuration, saveData.id);

  // const existingMedia = await Media.findOne({_id: saveData.id})

  const locations = await Video.find({ media: saveData.id });

  console.log("locations :", locations);

  const id = new ObjectId(saveData.id);

  const updated = await Media.findOneAndUpdate(
    { _id: id },
    { mediaLocation: vidData.mediaLocation, availableAdClips: locations.length }
  );

  res.status(200).json({ location: vidData.locations, saveData: updated });
});

// api for video
app.get("/video", (req, res) => {
  // const videoPath = path.join(__dirname, 'video', 'net.mp4');
  const videoPath =
    "C:\\Users\\Admin\\Desktop\\TruAd\\backend\\TruAD_backend\\uploads\\blendFiles\\1713852780655-production_id_3830513 (1080p).mp4";
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

app.get("/get-video", async (req, res) => {
  const data = await Items.find({ blendFile: { $exists: true, $ne: null } });
  res.status(200).json({ data });
});

app.get("/media", async (req, res) => {
try {
  const data = await Media.find().sort({ createdAt: -1 });

  res.status(200).json({ data });
} catch (error) {
  console.log(error)
  res.status(500).json({message: "Internal Server Error"})
}
});

app.get('/allItems', async(req, res) => {
  try {
    const items = await Items.find()
    if(!items){
      return res.status(404).json({message: "No clips found"})
    }
  
    res.status(200).json({items})
  
  } catch (error) {
    console.log(error)
    res.status(500).json({message: "Internal Server Error"})    
  }
})

app.post("/get-existingItem", async (req, res) => {
  // const mongoURI = 'mongodb://13.201.125.107:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.3';

  // const client = new MongoClient(mongoURI);

  // try {
  //     await client.connect();

  //     const db = client.db("test");
  //     const videos = db.collection("videos");
  //     const items = db.collection('items');

  //     const id = req.body.id;

  //     // Find the parent video based on materialID
  //     const parent = await videos.findOne({ materialID: id });

  //     if (!parent) {
  //         return res.status(404).json({ message: "Parent video not found" });
  //     }

  //     // Find all existingItem with the same parent ID
  //     const locationsCursor = items.find({ parent: parent._id });
  //     const locations = await locationsCursor.toArray();

  //     res.status(200).json({ locations, parent });
  // } catch (error) {
  //     console.error("Error fetching existingItem:", error);
  //     res.status(500).json({ message: "Internal server error" });
  // } finally {
  //     await client.close();
  // }
  const id = req.body.id;

  try {
    const video = await Video.findOne({ materialID: id });
    if (!video) {
      return res.status(404);
    }
    const locations = await Items.find({ parent: video._id });

    res.status(200).json({ locations });
  } catch (error) {
    console.log(error);
  }
});

app.get("/get-ids", async (req, res) => {
  try {
    const videos = await Video.find();

    if (!videos) {
      return res.status(404).json({ message: "Not found" });
    }
    const ids = videos.map((elem) => elem.materialID);

    res.status(200).json({ ids });
  } catch (error) {
    console.log(error);
  }
});

app.post("/blend-clip", async (req, res) => {
  const itemID = req.body.id;

  try {
    const existingItem = await Items.findOne({ _id: itemID });
    if (!existingItem) {
      return res.status(404).json({ message: "Item does not exist" });
    }

    existingItem.blend = true;
    await existingItem.save();

    res.status(200).json({ messgae: "Success" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    console.log(error);
  }
});

app.get("/edits", async (req, res) => {
  try {
    const existingItem = await Items.find({ blend: true });
    if (!existingItem) {
      return res.status(404).json({ message: "Not found" });
    }

    res.status(200).json({ existingItem });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    console.log(error);
  }
});

app.get("/add-be", async (req, res) => {
  try {
    const newItem = new Items({
      name: "/home/vboxuser/Downloads/videoAD3/upload/popat_splits/split_video_10.mp4",
      parent: "6638c56ee1c72c513e6fdbbb",
      location:
        "https://videotruad.s3.ap-south-1.amazonaws.com/split_video_10.mp4",
    });

    await newItem.save();
    res.status(200).send("Successsss");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/remove-blend", async(req, res) => {
  const {itemID} = req.body
  console.log(itemID)
  try {

    const updated = await Items.findOneAndUpdate(
      { _id: itemID }, // Filter criteria to identify the document
      { $unset: { blendFile: "" } } // Remove the `blendFile` property
    )

    res.status(200).json({message: "BlendFile Removed Successfully"})

    console.log('updated', updated)
  } catch (error) {
    res.status(500).json({message: "Internal Server Error"})
    console.log(error)
  }
})

app.get("/notifications", async(req, res) => {
  try {
    const notifications = await Notification.find();
    res.status(200).json({notifications})
  } catch (error) {
    res.status(500).json({message: "Internal Server Error"})
  }
})

app.get("/band", async(req, res) => {
  try {
    const bands = await Band.find();
    if(!bands){
      return res.status(404).json({message: "No bands found"})
    }

    return res.status(200).json({message: "Bands found", bands})
  } catch (error) {
    return res.status(500).json({message: "Internal Server Error"})
  }
})

app.post("/band", uploader.single("band"), async (req, res) => {
  try {
    const file = req.file;
    const name = req.body.name;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!name) {
      return res.status(400).json({ message: "No name provided" });
    }

    const params = {
      Bucket: process.env.BUCKET,
      Key: file.originalname,
      Body: file.buffer
    };

    s3.upload(params, async (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error uploading file");
      }

      console.log(data);
      const newBand = new Band({
        name: name, // Use the name from req.body
        location: data.Location
      });

      try {
        await newBand.save();
        res.json({ message: "Direct message and file details stored." });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving item" });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// <<<<<<< HEAD
app.put("/upload/:clipId", uploader.single('blendFiles'), async (req, res) => {
  // try {
  //   let filePath = req.file;
  //   const id=req.params.clipId
  //   const existingItem = await Items.findById(id);
  //   if (!existingItem) {
  //     return res.status(404).json({ message: "Not found" });
  //   } else if (!req.files || req.files.length === 0) {
  //     return res.status(404).json({ message: "Item does not exist" });
  //   } else {
  //     // Provide a more informative message upon successful upload
  //     existingItem.blendFile = filePath;
  //   await existingItem.save();
  //     return res
  //       .status(200)
  //       .json({
  //           message: "File has been successfully uploaded",
  //           item: existingItem
  //         });
  //   }
  // } catch (error) {
  //   console.log("error=>", error);
  //   res.status(500).json({ message: "Server error", error: error.message });
  // }
// =======
// app.put("/upload/:clipId", upload, async (req, res) => {
//   try {
//     console.log(req);
//     let filePath = req.file;
//     const id=req.params.clipId
//     const existingItem = await Items.findById(id);
//     if (!existingItem) {
//       return res.status(404).json({ message: "Not found" });
//     } else if (!req.files || req.files.length === 0) {
//       return res.status(404).json({ message: "Item does not exist" });
//     } else {
//       // Provide a more informative message upon successful upload
//       existingItem.blendFile = filePath;
//     await existingItem.save();
//       return res
//         .status(200)
//         .json({
//             message: "File has been successfully uploaded",
//             item: existingItem
//           });
//     }
//   } catch (error) {
//     console.log("error=>", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });
// >>>>>>> 18b9dfcc9a4de725dde9383e997548ca58e17e42
  console.log("hit")
    try {
      const id = req.params.clipId; // Access request parameters using dot notation
      const file = req.file;
      const existingItem = await Items.findOne({ _id: id }).exec(); // Use .exec() to return a promise
  
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }
  
      const params = {
        Bucket: process.env.BUCKET,
        Key: req.file.originalname,
        Body: req.file.buffer
      };

      const newNotif = new Notification({
        title: `${existingItem.name.split("videoAD3/upload/")[1]} Processed`,
        clip: existingItem._id
      })
  
      s3.upload(params, async (err, data) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error uploading file");
        }
  
        console.log(data);
        existingItem.blendFile = data.Location;
  
        try {
          await existingItem.save();
          await newNotif.save() // Use await with save to ensure it completes before sending response
          res.json({ message: "Direct message and file details stored." });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: "Error saving item" });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/uploadMaterials", verifyToken, uploader.single('file'), async (req, res) => {
    try {
      const token = req.token;
  
      const fileObj = JSON.parse(req.body.fileObj);
      console.log('fileobj', fileObj);
  
      console.log("token", token);
  
      const file = req.file;
      console.log(file);
  
      const newMaterial = new Material(fileObj);
      const params = {
        Bucket: process.env.BUCKET,
        Key: req.file.originalname,
        Body: req.file.buffer
      };

      const verifyToken = () => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, process.env.SECRET, (err, data) => {
                if(err){
                    reject(err)
                } else{
                    resolve(data)
                }
            })
        })
    }

    const data = await verifyToken();

    console.log('userdata', data)

    const existingUser = await User.findOne({email: data.email})

    if(!existingUser){
        return res.status(404).json({message: "User not found"})
    }

    console.log(existingUser)

    newMaterial.uploadedBy = existingUser._id;
  
      s3.upload(params, async (err, data) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error uploading file");
        }
  
        console.log("data", data);
        newMaterial.url = data.Location;
  
        try {
          await newMaterial.save();
          return res.status(200).json({ message: "File and material saved" });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ message: "Error saving material" });
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  
// api for video and image
app.get("/image/", (req, res) => {
  console.log(req);
  // const filename = req.params.filename;
  // const filePath = path.join(filename);

  // Send the image file to the client
  const file =
    "C:\\Users\\Admin\\Desktop\\TruAd\\backend\\TruAD_backend\\uploads\\blendFiles\\1713852780655-production_id_3830513 (1080p).mp4";
  res.sendFile(file, (err) => {
    if (err) {
      console.log(err);
      res.status(404).send("Sorry, we cannot find that file!");
    }
  });
});

export default app;