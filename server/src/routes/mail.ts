import { Router, Response } from 'express';
import { ImapFlow } from 'imapflow';
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

export default router;
