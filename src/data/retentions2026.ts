// Official IPL 2026 retained players per team (matched by player name)
// Source: NDTV Sports, ESPN Cricinfo - November 2025
// Includes trades (e.g., Sanju Samson traded CSK<-RR, Jadeja traded RR<-CSK)

export const RETENTIONS_2026: Record<string, string[]> = {
  CSK: [
    "Ruturaj Gaikwad", "MS Dhoni", "Dewald Brevis", "Ayush Mhatre",
    "Urvil Patel", "Anshul Kamboj", "Jamie Overton", "Ramakrishna Ghosh",
    "Shivam Dube", "Khaleel Ahmed", "Noor Ahmad", "Mukesh Choudhary",
    "Nathan Ellis", "Shreyas Gopal", "Gurjapneet Singh",
    "Sanju Samson", // traded in from RR
  ],
  MI: [
    "Rohit Sharma", "Jasprit Bumrah", "Hardik Pandya", "Suryakumar Yadav",
    "Tilak Varma", "Mitchell Santner", "Trent Boult", "Deepak Chahar",
    "Will Jacks", "Ryan Rickelton", "Corbin Bosch", "AM Ghazanfar",
    "Ashwani Kumar", "Naman Dhir", "Raghu Sharma", "Raj Angad Bawa", "Robin Minz",
    "Sherfane Rutherford", // traded in from GT
    "Shardul Thakur", // traded in from LSG
    "Mayank Markande", // traded in from KKR
  ],
  RCB: [
    "Virat Kohli", "Rajat Patidar", "Devdutt Padikkal", "Phil Salt",
    "Jitesh Sharma", "Krunal Pandya", "Swapnil Singh", "Tim David",
    "Romario Shepherd", "Jacob Bethell", "Josh Hazlewood", "Yash Dayal",
    "Bhuvneshwar Kumar", "Nuwan Thushara", "Rasikh Salam",
    "Abhinandan Singh", "Suyash Sharma",
  ],
  DC: [
    "KL Rahul", "Karun Nair", "Abishek Porel", "Tristan Stubbs",
    "Axar Patel", "Sameer Rizvi", "Ashutosh Sharma", "Vipraj Nigam",
    "Ajay Mandal", "Tripurana Vijay", "Madhav Tiwari",
    "Mitchell Starc", "T Natarajan", "Mukesh Kumar", "Dushmantha Chameera",
    "Kuldeep Yadav",
    "Nitish Rana", // traded in from RR
  ],
  KKR: [
    "Ajinkya Rahane", "Angkrish Raghuvanshi", "Anukul Roy",
    "Harshit Rana", "Manish Pandey", "Ramandeep Singh",
    "Rinku Singh", "Rovman Powell", "Sunil Narine",
    "Umran Malik", "Vaibhav Arora", "Varun Chakaravarthy",
  ],
  SRH: [
    "Pat Cummins", "Travis Head", "Abhishek Sharma", "Aniket Verma",
    "Ishan Kishan", "Heinrich Klaasen", "Nitish Kumar Reddy",
    "Harsh Dubey", "Kamindu Mendis", "Harshal Patel",
    "Brydon Carse", "Jaydev Unadkat", "Eshan Malinga", "Zeeshan Ansari",
  ],
  PBKS: [
    "Prabhsimran Singh", "Priyansh Arya", "Shreyas Iyer", "Shashank Singh",
    "Nehal Wadhera", "Marcus Stoinis", "Azmatullah Omarzai", "Marco Jansen",
    "Harpreet Brar", "Yuzvendra Chahal", "Arshdeep Singh", "Musheer Khan",
    "Suryansh Shedge", "Mitchell Owen", "Xavier Bartlett",
    "Lockie Ferguson", "Vyshak Vijaykumar", "Yash Thakur", "Vishnu Vinod",
    "Harnoor Pannu", "Pyala Avinash",
  ],
  RR: [
    "Yashasvi Jaiswal", "Riyan Parag", "Shimron Hetmyer",
    "Shubham Dubey", "Vaibhav Suryavanshi", "Dhruv Jurel",
    "Yudhvir Charak", "Jofra Archer", "Tushar Deshpande",
    "Kwena Maphaka", "Nandre Burger", "Lhuan-Dre Pretorius",
    "Ravindra Jadeja", // traded in from CSK
    "Sam Curran", // traded in from CSK
  ],
  GT: [
    "Shubman Gill", "Sai Sudharsan", "Kumar Kushagra", "Anuj Rawat",
    "Jos Buttler", "Nishant Sindhu", "Washington Sundar", "Arshad Khan",
    "Shahrukh Khan", "Rahul Tewatia", "Kagiso Rabada", "Mohammed Siraj",
    "Prasidh Krishna", "Ishant Sharma", "Gurnoor Singh Brar",
    "Rashid Khan", "Manav Suthar", "Sai Kishore", "Jayant Yadav", "Glenn Phillips",
  ],
  LSG: [
    "Rishabh Pant", "Ayush Badoni", "Aiden Markram", "Matthew Breetzke",
    "Himmat Singh", "Abdul Samad", "Nicholas Pooran", "Mitchell Marsh",
    "Shahbaz Ahmed", "Arshin Kulkarni", "Mayank Yadav", "Avesh Khan",
    "Mohsin Khan", "Manimaran Siddharth", "Digvesh Rathi", "Prince Yadav", "Akash Singh",
    "Mohammed Shami", // traded in from SRH
    "Arjun Tendulkar", // traded in from MI
  ],
};

// Purse remaining after retentions (in Crores, from official data)
export const PURSE_REMAINING_2026: Record<string, number> = {
  CSK: 43.40,
  MI: 2.75,
  RCB: 16.40,
  DC: 21.80,
  KKR: 64.30,
  SRH: 25.50,
  PBKS: 11.50,
  RR: 16.05,
  GT: 12.90,
  LSG: 22.95,
};
