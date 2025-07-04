const { Uploader } = require("../libs/s3/s3");
const uploader = new Uploader();

// sanitize and trim file name
const sanitizeFileName = (fileName) => {
  const nameWithoutSpaces = fileName.trim().replace(/\s+/g, "-");
  const cleanName = nameWithoutSpaces.replace(/[^a-zA-Z0-9.\-_]/g, "");
  const timestamp = Date.now();
  const finalName = `${timestamp}-${cleanName}`;
  return finalName;
};

// Public file upload (folder: 'public')
exports.uploadPublic = async (req, res, next) => {
  try {
    const file = req.file.buffer;
    const fileName = sanitizeFileName(req.file.originalname);
    const folder = "public";

    const url = await uploader.uploadPublicFile(folder, fileName, file);

    res.status(200).json({ success: true, url, status: 200 });
  } catch (error) {
    next(error);
  }
};

// Private file upload (folder: 'private')
exports.uploadPrivate = async (req, res, next) => {
  try {
    const file = req.file.buffer;
    const fileName = sanitizeFileName(req.file.originalname);
    const folder = "private";

    const key = await uploader.uploadPrivateFile(folder, fileName, file);

    res.status(200).json({ success: true, key });
  } catch (error) {
    next(error);
  }
};

// Generate Pre-signed URL for private file
exports.getPresignedUrl = async (req, res, next) => {
  try {
    const fileKey = req.query.key;

    if (!fileKey) {
      return res
        .status(400)
        .json({ success: false, message: "Missing file key" });
    }

    const url = await Uploader.generatePresignedUrl(fileKey);

    res.status(200).json({ success: true, url });
  } catch (error) {
    next(error);
  }
};
