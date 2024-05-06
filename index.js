const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "theboys",
    password: "ds564",
    port: 7007,
});

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`<h3>Seja bem-vindo ao backend de The Boys</h3>
    <img src="https://lesbout.com.br/wp-content/uploads/2022/06/the-boys-1.jpeg" alt="The Boys" width="580" height="400">
    `
    );
});

app.get('/heroes', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM heroes");
        res.json({
            status: "success",
            message: "Lista de herois",
            quantity: result.rowCount,
            herois: result.rows,
        });
    } catch (error) {
        console.error("Erro ao buscar herois", error);
    }
});


app.get('/heroes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM heroes WHERE id = $1", [id]);
        if (result.rowCount === 0) {
            res.json({
                status: "error",
                message: `Heroi com id ${id} não encontrado`,
            });
        }
        res.json({
            status: "success",
            message: "Heroi encontrado",
            heroi: result.rows[0],
        });
    } catch (error) {
        console.error("Erro ao buscar heroi", error);
    }
});

app.get('/heroes/name/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const result = await pool.query(
            "SELECT * FROM heroes WHERE LOWER(name) LIKE $1",
            [`%${name.toLowerCase()}%`]);
        if (result.rowCount === 0) {
            res.json({
                status: "error",
                message: `Heroi com nome ${name} não encontrado`,
            });
        }
        res.json({
            status: "success",
            message: "Heroi encontrado",
            heroi: result.rows,
        });
    } catch (error) {
        console.error("Erro ao buscar heroi", error);
        res.status(500).send({
            status: "error",
            message: "Erro ao buscar heroi",
        });
    }
});

app.post('/heroes', async (req, res) => {
    const { name, skill, power, level, health } = req.body;
    try {
        if (name.length < 3) {
            res.json({
                status: "error",
                message: "Nome do heroi deve ter no mínimo 3 caracteres",
            });
            return;
        }
        await pool.query("INSERT INTO heroes (name, skill, power, level, health) VALUES ($1, $2, $3, $4, $5)", [name, skill, power, level, health]);
        res.json({
            status: "success",
            message: "Heroi criado com sucesso",
        });
    } catch (error) {
        console.error("Erro ao criar heroi", error);
        res.status(500).send({
            status: "error",
            message: "Erro ao criar heroi",
        });
    }
});

app.put('/heroes/:id', async (req, res) => {
    try {
        const { name, skill, power, level, health } = req.body;
        const { id } = req.params;
        if (name.length < 3) {
            res.json({
                status: "error",
                message: "Nome do heroi deve ter no mínimo 3 caracteres",
            });
            return;
        }
        await pool.query("UPDATE heroes SET name = $1, skill = $2, power = $3, level = $4, health = $5 WHERE id = $6", [name, skill, power, level, health, id]);
        res.json({
            status: "success",
            message: "Heroi atualizado com sucesso",
        });
    } catch (error) {
        console.error("Erro ao atualizar heroi", error);
        res.status(500).send({
            status: "error",
            message: "Erro ao atualizar heroi",
        });
    }
});

app.delete('/heroes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM heroes WHERE id = $1", [id]);
        if (result.rowCount === 0) {
            res.json({
                status: "error",
                message: `Heroi com id ${id} não encontrado`,
            });
        }
        res.json({
            status: "success",
            message: "Heroi deletado com sucesso",
        });
    } catch (error) {
        console.error("Erro ao deletar heroi", error);
        res.status(500).send({
            status: "error",
            message: "Erro ao deletar heroi",
        });
    }
});

/* Battle endpoints */

async function CalcWinner(hero1, hero2) {
    const hero1Power = hero1.power * hero1.health;
    const hero2Power = hero2.power * hero2.health;

    if (hero1Power > hero2Power) {
        return hero1;
    } else {
        return hero2;
    }
}

app.post('/battles', async (req, res) => {
    try {
        const { hero1Id, hero2Id } = req.body;

        const hero1 = await pool.query("SELECT * FROM heroes WHERE id = $1", [hero1Id]);
        const hero2 = await pool.query("SELECT * FROM heroes WHERE id = $1", [hero2Id]);

        if (hero1.rowCount == 0 || hero2.rowCount == 0) {
            res.status(500).send({
                status: "error",
                message: "Herói não encontrado",
            });
            return;
        }

        const winner = await CalcWinner(hero1.rows[0], hero2.rows[0]);

        await pool.query("INSERT INTO battles (hero1_id, hero2_id, winner_id, loser_id) VALUES ($1, $2, $3, $4)", [hero1Id, hero2Id, winner.id, hero1Id == winner.id ? hero2Id : hero1Id]);

        res.json({
            status: "success",
            message: "Batalha realizada com sucesso",
            "winner 🏆": winner,
        });

    } catch (error) {
        console.error("Erro ao realizar batalha", error);
        res.status(500).send({
            status: "error",
            message: "Erro ao realizar batalha",
        });
    }
});

app.get('/battles', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT battles.id, 
                   battles.winner_id, 
                   battles.loser_id, 
                   winner.name AS winner_name, 
                   winner.skill AS winner_skill,
                   winner.power AS winner_power,
                   winner.level AS winner_level,
                   winner.health AS winner_health,
                   loser.name AS loser_name, 
                   loser.skill AS loser_skill,
                   loser.power AS loser_power,
                   loser.level AS loser_level,
                   loser.health AS loser_health
            FROM battles
            INNER JOIN heroes AS winner ON battles.winner_id = winner.id
            INNER JOIN heroes AS loser ON battles.loser_id = loser.id
        `);
        res.json({
            status: "success",
            message: "Lista de batalhas",
            quantity: result.rowCount,
            battles: result.rows,
        });
    } catch (error) {
        console.error("Erro ao buscar batalhas", error);
        res.status(500).send({
            status: "error",
            message: "Erro ao buscar batalhas",
        });
    }
});




app.listen(PORT, () => {
    console.log(`Servidor online e roteando 😎🙏 na porta: ${PORT}`);
});