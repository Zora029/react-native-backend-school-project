import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { Pool } from "pg";
import { z } from "zod";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT ?? 5432),
});

class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};

const createClientSchema = z.object({
  num_compte: z.string().trim().min(1, "num_compte is required"),
  nom: z.string().trim().min(1, "nom is required"),
  solde: z.coerce.number("solde must be a valid number"),
});

const updateClientSchema = z
  .object({
    num_compte: z.string().trim().min(1).optional(),
    nom: z.string().trim().min(1).optional(),
    solde: z.coerce.number().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required to update",
  });

app.use(cors());
app.use(express.json());

app.get(
  "/api/clients/stats",
  asyncHandler(async (_req, res) => {
    const result = await pool.query(
      `SELECT
				COALESCE(SUM(solde), 0) AS total_balance,
				COALESCE(MIN(solde), 0) AS min_balance,
				COALESCE(MAX(solde), 0) AS max_balance
			 FROM clients`,
    );

    const row = result.rows[0];
    res.status(200).json({
      totalBalance: Number(row.total_balance),
      minBalance: Number(row.min_balance),
      maxBalance: Number(row.max_balance),
    });
  }),
);

app.get(
  "/api/clients",
  asyncHandler(async (_req, res) => {
    const result = await pool.query(
      "SELECT id, num_compte, nom, solde FROM clients ORDER BY id ASC",
    );
    console.log(JSON.stringify(result.rows, null, 2));
    res.status(200).json(result.rows);
  }),
);

app.post(
  "/api/clients",
  asyncHandler(async (req, res) => {
    const payload = createClientSchema.parse(req.body);

    const result = await pool.query(
      "INSERT INTO clients (num_compte, nom, solde) VALUES ($1, $2, $3) RETURNING id, num_compte, nom, solde",
      [payload.num_compte, payload.nom, payload.solde],
    );

    res.status(201).json(result.rows[0]);
  }),
);

app.put(
  "/api/clients/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, "Invalid client id");
    }

    const payload = updateClientSchema.parse(req.body);
    const updates: string[] = [];
    const values: Array<string | number> = [];

    if (payload.num_compte !== undefined) {
      values.push(payload.num_compte);
      updates.push(`num_compte = $${values.length}`);
    }

    if (payload.nom !== undefined) {
      values.push(payload.nom);
      updates.push(`nom = $${values.length}`);
    }

    if (payload.solde !== undefined) {
      values.push(payload.solde);
      updates.push(`solde = $${values.length}`);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE clients
			 SET ${updates.join(", ")}
			 WHERE id = $${values.length}
			 RETURNING id, num_compte, nom, solde`,
      values,
    );

    if (result.rowCount === 0) {
      throw new AppError(404, "Client not found");
    }

    res.status(200).json(result.rows[0]);
  }),
);

app.delete(
  "/api/clients/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, "Invalid client id");
    }

    const result = await pool.query("DELETE FROM clients WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      throw new AppError(404, "Client not found");
    }

    res.status(204).send();
  }),
);

app.use((_req, _res, next) => {
  next(new AppError(404, "Route not found"));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Validation error",
      issues: error.issues,
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
});

const initializeDatabase = async () => {
  await pool.query(`
		CREATE TABLE IF NOT EXISTS clients (
			id SERIAL PRIMARY KEY,
			num_compte VARCHAR(255) NOT NULL,
			nom VARCHAR(255) NOT NULL,
			solde NUMERIC(14, 2) NOT NULL DEFAULT 0
		)
	`);
};

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`API server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();
