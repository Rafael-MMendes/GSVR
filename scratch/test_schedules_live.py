import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmd = """docker exec ft-backend node -e '
const http = require("http");
const jwt = require("jsonwebtoken");
const db = require("./db");
const secret = process.env.JWT_SECRET || "gsvr_secret_key_2026_pmal";
const token = jwt.sign({ id: 1, nome: "Teste", perfil: "ADMINISTRADOR", is_superuser: true }, secret, { expiresIn: "5m" });

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: 3001, path, method: "GET", headers: { Authorization: "Bearer " + token } }, res => {
      let d = "";
      res.on("data", x => d += x);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  const sample = await db.query("SELECT id_ciclo, data_servico::text AS dt, COUNT(*) AS cnt FROM ESCALA_PLANEJAMENTO GROUP BY id_ciclo, data_servico ORDER BY data_servico DESC LIMIT 3");
  console.log("DB SAMPLE:", sample.rows);
  if (sample.rows.length > 0) {
    const { id_ciclo, dt } = sample.rows[0];
    const resp = await get(`/api/schedules?date=${dt}&id_ciclo=${id_ciclo}`);
    console.log("API STATUS:", resp.status);
    console.log("PATROLS COUNT:", resp.body?.[0]?.patrols?.length ?? 0);
    if (resp.body?.[0]?.patrols?.[0]) {
      console.log("FIRST PATROL:", JSON.stringify(resp.body[0].patrols[0], null, 2));
    }
  }
  process.exit(0);
})();
'"""

_, out, err = c.exec_command(cmd)
print(out.read().decode())
e = err.read().decode()
if e:
    print("ERR:", e)
c.close()
