import { Router, Response } from 'express';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const getImapClient = () => new ImapFlow({
  host: process.env.IMAP_HOST || 'localhost',
  port: Number(process.env.IMAP_PORT) || 143,
  secure: false,
  tls: {
    rejectUnauthorized: false
  },
  auth: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASSWORD || ''
  },
  logger: false
});

router.get('/inbox', authMiddleware, async (req: AuthRequest, res: Response) => {
  const client = getImapClient();
  try {
    await client.connect();
    const mailbox = await client.mailboxOpen('INBOX');

    const messages: object[] = [];

    if (mailbox.exists > 0) {
      for await (const msg of client.fetch('1:*', {
        envelope: true,
        bodyStructure: true
      })) {
        if (!msg.envelope) {
          continue;
        }

        messages.push({
          id: msg.uid,
          subject: msg.envelope.subject,
          from: msg.envelope.from?.[0]?.address,
          date: msg.envelope.date
        });
      }
    }

    await client.logout();
    res.json({ messages: messages.reverse() });
  } catch (err) {
    await client.logout().catch(() => {});
    console.error('IMAP error:', err);
    res.status(500).json({ error: 'IMAP connection failed' });
  }
});

router.get('/message/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const client = getImapClient();

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    const uid = Number(req.params.id);
    const message = await client.fetchOne(`${uid}`, {
      envelope: true,
      bodyStructure: true,
      source: true
    }, { uid: true });

    await client.logout();

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    res.json({
      id: message.uid,
      subject: message.envelope?.subject,
      from: message.envelope?.from?.[0]?.address,
      to: message.envelope?.to?.[0]?.address,
      date: message.envelope?.date,
      body: message.source?.toString()
    });
  } catch (err) {
    await client.logout().catch(() => {});
    console.error('IMAP error:', err);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

router.post('/send', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    res.status(400).json({ error: 'to, subject and body are required' });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 25,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: `${process.env.MAIL_USER}@${process.env.MAIL_DOMAIN}`,
      to,
      subject,
      text: body
    });

    res.json({ success: true });
  } catch (err) {
    console.error('SMTP error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.delete('/message/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const client = getImapClient();
  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    const uid = Number(req.params.id);
    await client.messageDelete(`${uid}`, { uid: true });

    await client.logout();
    res.json({ success: true });
  } catch (err) {
    await client.logout().catch(() => {});
    console.error('IMAP error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
