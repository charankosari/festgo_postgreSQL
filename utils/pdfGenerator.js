const PDFDocument = require("pdfkit");

/**
 * Generate a City Fest PDF (ticket/invoice-like) with dynamic data.
 * Returns a Promise that resolves to a Buffer containing the PDF bytes.
 *
 * Expected data fields (use what's available):
 * - fest: { name, location, event_start, event_end }
 * - booking: { reciept, passes, amount_paid, payment_method, booking_status }
 * - user: { name, phone, email }
 */
async function generateCityFestPDF(data = {}) {
  const {
    fest = {},
    booking = {},
    user = {},
    title = "City Fest Pass",
    watermark = null,
  } = data;

  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const chunks = [];
  return await new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Header
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(title, { align: "center" })
      .moveDown(0.5);

    // Optional watermark
    if (watermark) {
      try {
        doc.save().opacity(0.1);
        doc.image(watermark, doc.page.width / 2 - 150, 120, { width: 300 });
        doc.restore();
      } catch (e) {
        // ignore image load failures
      }
    }

    // Ticket meta box
    const sectionTop = doc.y + 10;
    doc
      .moveTo(40, sectionTop)
      .lineTo(doc.page.width - 40, sectionTop)
      .strokeColor("#e5e7eb")
      .stroke();

    doc.moveDown();

    // Fest details
    doc
      .fontSize(12)
      .fillColor("#111827");

    const festName = fest.name || "City Fest";
    const festLocation = fest.location || "-";
    const start = formatDateTime(fest.event_start);
    const end = formatDateTime(fest.event_end);

    labeledLine(doc, "Event", festName);
    labeledLine(doc, "Location", festLocation);
    labeledLine(doc, "Starts", start);
    labeledLine(doc, "Ends", end);

    doc.moveDown(0.5);
    drawDivider(doc);

    // Attendee/User details
    labeledLine(doc, "Attendee", user.name || "-");
    labeledLine(doc, "Phone", user.phone || "-");
    labeledLine(doc, "Email", user.email || "-");

    doc.moveDown(0.5);
    drawDivider(doc);

    // Booking and payment details
    labeledLine(doc, "Receipt No.", booking.reciept || "-");
    labeledLine(doc, "Passes", isFiniteNumber(booking.passes) ? String(booking.passes) : "-");
    labeledLine(
      doc,
      "Amount Paid",
      isFiniteNumber(booking.amount_paid) ? `₹ ${Number(booking.amount_paid).toFixed(2)}` : "-"
    );
    labeledLine(doc, "Payment Method", booking.payment_method || "-");
    labeledLine(doc, "Status", (booking.booking_status || "").toString());

    doc.moveDown(1);

    // Terms / note
    doc
      .fontSize(9)
      .fillColor("#6b7280")
      .text(
        "Please present a valid ID along with this pass at the entry. This PDF is system-generated and valid without a signature.",
        { align: "left" }
      );

    // Footer
    doc.moveDown(2);
    drawDivider(doc);
    doc
      .fontSize(9)
      .fillColor("#9ca3af")
      .text("Powered by Festgo", { align: "center" });

    doc.end();
  });
}

function labeledLine(doc, label, value) {
  const leftX = doc.x;
  doc.font("Helvetica-Bold").fillColor("#374151").text(`${label}:`, { continued: true });
  doc
    .font("Helvetica")
    .fillColor("#111827")
    .text(` ${value ?? "-"}`);
  doc.x = leftX; // keep left alignment consistent
}

function drawDivider(doc) {
  const y = doc.y + 6;
  doc
    .moveTo(40, y)
    .lineTo(doc.page.width - 40, y)
    .strokeColor("#e5e7eb")
    .stroke();
  doc.moveDown(0.6);
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return String(value);
  }
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

module.exports = { generateCityFestPDF };


