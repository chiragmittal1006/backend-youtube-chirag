import multer from "multer";
import fs from "fs";


// Create the destination directory if it doesn't exist
const destinationDir = "../public/uploads";
if (!fs.existsSync(destinationDir)) {
  fs.mkdirSync(destinationDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, destinationDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" +  file.originalname);

  },
});

export const upload = multer({ storage: storage });

//   app.post('/upload', upload.single('file'), function (req, res, next) {
//     // req.file contains information about the uploaded file
//     // req.body contains information about other form fields
//      console.log(res.body);
//      console.log(res.file);
//     res.redirect(/);
//   })
