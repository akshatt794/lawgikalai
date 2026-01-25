const nodemailer = require("nodemailer");
const { getCorporateLeadAutoReplyTemplate } = require("./leadEmailTemplates");

const transporter = nodemailer.createTransport({
  service: "gmail.com",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.APP_PWD,
  },
});

// 📩 Admin notification
const sendCorporateLeadEmailToAdmin = async (lead) => {
  await transporter.sendMail({
    from: `"LawgikalAI" <${process.env.ADMIN_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "📩 New Corporate Lead - LawgikalAI",
    html: `
      <h2>New Corporate Lead</h2>
      <p><strong>Name:</strong> ${lead.name}</p>
      <p><strong>Organization:</strong> ${lead.organization}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Phone:</strong> ${lead.phone}</p>
      <p><strong>Message:</strong></p>
      <p>${lead.message || "—"}</p>
      <hr />
      <p>Status: <strong>${lead.status}</strong></p>
    `,
  });
};

// 📬 Auto-reply to lead
const sendCorporateLeadAutoReply = async (lead) => {
  await transporter.sendMail({
    from: `"LawgikalAI" <${process.env.ADMIN_EMAIL}>`,
    to: lead.email,
    subject: "We’ve received your request – LawgikalAI Corporate",
    html: getCorporateLeadAutoReplyTemplate({
      name: lead.name,
    }),
  });
};

module.exports = {
  sendCorporateLeadEmailToAdmin,
  sendCorporateLeadAutoReply,
};
