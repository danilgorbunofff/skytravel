import nodemailer from "nodemailer";
import { config } from "../config.js";

const { smtp } = config;

export const transporter = smtp.isConfigured
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    })
  : null;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
