const { ContactMessage } = require("../models/services");

// Create a new message
exports.createMessage = async (req, res) => {
  try {
    const { firstName, lastName, email, number, subject, message } = req.body;

    if (!firstName || !lastName || !email || !number) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const newMessage = await ContactMessage.create({
      firstName,
      lastName,
      email,
      number,
      subject,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Message received successfully.",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

// Get all messages
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
};
