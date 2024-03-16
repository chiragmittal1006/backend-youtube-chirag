import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.originalname + "-" + uniqueSuffix);
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
