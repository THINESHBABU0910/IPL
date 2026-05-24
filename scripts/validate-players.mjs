import data from "../src/data/players.json" with { type: "json" };

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
const allRetained = new Set(Object.values(RETENTIONS_2026).flat().map(norm));
const matched = data.players.filter((p) => allRetained.has(norm(p.name)));
const missing = [...allRetained].filter((n) => !data.players.some((p) => norm(p.name) === n));

console.log("Total players:", data.players.length);
console.log("Retained matched:", matched.length, "/", allRetained.size);
console.log("Missing retained:", missing);
console.log("Released pool:", data.players.filter((p) => !allRetained.has(norm(p.name))).length);
console.log("Overseas:", data.players.filter((p) => p.isOverseas).length);

for (const n of ["Cameron Green", "Virat Kohli", "Prashant Veer", "Pathum Nissanka", "Ravindra Jadeja", "Matheesha Pathirana", "Blessing Muzarabani"]) {
  const p = data.players.find((x) => x.name === n);
  console.log(n + ":", p ? `${p.set} ${p.country} prev=${p.previousTeam} base=${p.basePrice / 100000}L` : "MISSING");
}
