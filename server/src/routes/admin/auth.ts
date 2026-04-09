import { Router } from "express";
import bcrypt from "bcrypt";
import prisma from "../../prisma.js";
import { config } from "../../config.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(async (req, res) => {
  const { login, password } = req.body ?? {};
  if (!login || !password) {
    return res.status(400).json({ error: "Missing credentials." });
  }

  const loginValue = String(login);
  const passwordValue = String(password);
  const { login: envLogin, password: envPassword } = config.admin;

  let user = await prisma.adminUser.findUnique({ where: { login: loginValue } });

  if (!user) {
    if (envLogin && envPassword && loginValue === envLogin && passwordValue === envPassword) {
      const passwordHash = await bcrypt.hash(passwordValue, 12);
      user = await prisma.adminUser.create({ data: { login: loginValue, passwordHash } });
    } else {
      return res.status(401).json({ error: "Invalid credentials." });
    }
  } else {
    const ok = await bcrypt.compare(passwordValue, user.passwordHash);
    if (!ok) {
      if (envLogin && envPassword && loginValue === envLogin && passwordValue === envPassword) {
        const passwordHash = await bcrypt.hash(passwordValue, 12);
        user = await prisma.adminUser.update({
          where: { id: user.id },
          data: { passwordHash },
        });
      } else {
        return res.status(401).json({ error: "Invalid credentials." });
      }
    }
  }

  const userId = user.id;
  const userLogin = user.login;
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.adminUserId = userId;
  req.session.adminLogin = userLogin;
  return res.json({ ok: true, login: userLogin });
}));

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).send();
  });
});

router.get("/me", (req, res) => {
  if (!req.session.adminUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ ok: true, login: req.session.adminLogin });
});

export default router;
