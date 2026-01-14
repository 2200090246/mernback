const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'n1775201@gmail.com',
        pass: 'hgylksqxvdttndet'
    }
});

module.exports = transporter;
