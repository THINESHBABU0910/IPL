/**
 * Sync previousTeam on retained IPL 2026 players so each franchise squad list is complete.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "src", "data", "players.json");

const RETENTIONS_2026 = {
  CSK: ["Ruturaj Gaikwad", "MS Dhoni", "Dewald Brevis", "Ayush Mhatre", "Urvil Patel", "Anshul Kamboj", "Jamie Overton", "Ramakrishna Ghosh", "Shivam Dube", "Khaleel Ahmed", "Noor Ahmad", "Mukesh Choudhary", "Nathan Ellis", "Shreyas Gopal", "Gurjapneet Singh", "Sanju Samson"],
  MI: ["Rohit Sharma", "Jasprit Bumrah", "Hardik Pandya", "Suryakumar Yadav", "Tilak Varma", "Mitchell Santner", "Trent Boult", "Deepak Chahar", "Will Jacks", "Ryan Rickelton", "Corbin Bosch", "AM Ghazanfar", "Ashwani Kumar", "Naman Dhir", "Raghu Sharma", "Raj Angad Bawa", "Robin Minz", "Sherfane Rutherford", "Shardul Thakur", "Mayank Markande"],
  RCB: ["Virat Kohli", "Rajat Patidar", "Devdutt Padikkal", "Phil Salt", "Jitesh Sharma", "Krunal Pandya", "Swapnil Singh", "Tim David", "Romario Shepherd", "Jacob Bethell", "Josh Hazlewood", "Yash Dayal", "Bhuvneshwar Kumar", "Nuwan Thushara", "Rasikh Salam", "Abhinandan Singh", "Suyash Sharma"],
  DC: ["KL Rahul", "Karun Nair", "Abishek Porel", "Tristan Stubbs", "Axar Patel", "Sameer Rizvi", "Ashutosh Sharma", "Vipraj Nigam", "Ajay Mandal", "Tripurana Vijay", "Madhav Tiwari", "Mitchell Starc", "T Natarajan", "Mukesh Kumar", "Dushmantha Chameera", "Kuldeep Yadav", "Nitish Rana"],
  KKR: ["Ajinkya Rahane", "Angkrish Raghuvanshi", "Anukul Roy", "Harshit Rana", "Manish Pandey", "Ramandeep Singh", "Rinku Singh", "Rovman Powell", "Sunil Narine", "Umran Malik", "Vaibhav Arora", "Varun Chakaravarthy"],
  SRH: ["Pat Cummins", "Travis Head", "Abhishek Sharma", "Aniket Verma", "Ishan Kishan", "Heinrich Klaasen", "Nitish Kumar Reddy", "Harsh Dubey", "Kamindu Mendis", "Harshal Patel", "Brydon Carse", "Jaydev Unadkat", "Eshan Malinga", "Zeeshan Ansari"],
  PBKS: ["Prabhsimran Singh", "Priyansh Arya", "Shreyas Iyer", "Shashank Singh", "Nehal Wadhera", "Marcus Stoinis", "Azmatullah Omarzai", "Marco Jansen", "Harpreet Brar", "Yuzvendra Chahal", "Arshdeep Singh", "Musheer Khan", "Suryansh Shedge", "Mitchell Owen", "Xavier Bartlett", "Lockie Ferguson", "Vyshak Vijaykumar", "Yash Thakur", "Vishnu Vinod", "Harnoor Pannu", "Pyala Avinash"],
  RR: ["Yashasvi Jaiswal", "Riyan Parag", "Shimron Hetmyer", "Shubham Dubey", "Vaibhav Suryavanshi", "Dhruv Jurel", "Yudhvir Charak", "Jofra Archer", "Tushar Deshpande", "Kwena Maphaka", "Nandre Burger", "Lhuan-Dre Pretorius", "Ravindra Jadeja", "Sam Curran"],
  GT: ["Shubman Gill", "Sai Sudharsan", "Kumar Kushagra", "Anuj Rawat", "Jos Buttler", "Nishant Sindhu", "Washington Sundar", "Arshad Khan", "Shahrukh Khan", "Rahul Tewatia", "Kagiso Rabada", "Mohammed Siraj", "Prasidh Krishna", "Ishant Sharma", "Gurnoor Singh Brar", "Rashid Khan", "Manav Suthar", "Sai Kishore", "Jayant Yadav", "Glenn Phillips"],
  LSG: ["Rishabh Pant", "Ayush Badoni", "Aiden Markram", "Matthew Breetzke", "Himmat Singh", "Abdul Samad", "Nicholas Pooran", "Mitchell Marsh", "Shahbaz Ahmed", "Arshin Kulkarni", "Mayank Yadav", "Avesh Khan", "Mohsin Khan", "Manimaran Siddharth", "Digvesh Rathi", "Prince Yadav", "Akash Singh", "Mohammed Shami", "Arjun Tendulkar"],
};

const norm = (n) => n.toLowerCase().replace(/\./g, "").trim();
const nameToTeam = new Map();
for (const [teamId, names] of Object.entries(RETENTIONS_2026)) {
  for (const name of names) nameToTeam.set(norm(name), teamId);
}

const data = JSON.parse(fs.readFileSync(PLAYERS_PATH, "utf-8"));
let updated = 0;
for (const p of data.players) {
  const teamId = nameToTeam.get(norm(p.name));
  if (teamId && p.previousTeam !== teamId) {
    p.previousTeam = teamId;
    updated++;
  }
}

fs.writeFileSync(PLAYERS_PATH, JSON.stringify(data, null, 2) + "\n");
console.log(`Updated previousTeam for ${updated} retained IPL 2026 players`);
for (const teamId of Object.keys(RETENTIONS_2026)) {
  const count = data.players.filter((p) => p.previousTeam === teamId).length;
  console.log(`  ${teamId}: ${count} squad players`);
}
