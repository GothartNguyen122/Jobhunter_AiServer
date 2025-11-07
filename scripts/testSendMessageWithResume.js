// Simple test runner for chatControllerWithResume.sendMessage
const controller = require('../controllers/chatControllerWithResume');

function makeReqRes(sampleMessage) {
  const req = {
    params: { chatboxId: 'default' },
    body: {
      message: sampleMessage,
      user: { id: 'tester', name: 'Test User', email: 'test@example.com', role: 'user' },
      sessionInfo: { hasSessionStorage: false }
    }
  };
  const res = {
    json: (payload) => {
      console.log('=== Response ===');
      console.log(JSON.stringify(payload, null, 2));
    },
    status: (code) => ({ json: (payload) => {
      console.log('=== Response (status ' + code + ') ===');
      console.log(JSON.stringify(payload, null, 2));
    }})
  };
  return { req, res };
}

async function run() {
    const sampleResumeInfo = {
        full_name: "Nguyen Huy Hoang Anh",
        objective: "A detail-oriented and proactive Front-End Software Engineer with two years of experience...",
        phone_number: "+84 346409257",
        email: "nguyenhuyhoanganh900@gmail.com",
        github: "https://github.com/hoanganh2k4",
        university: "Ho Chi Minh City University of Technology - VNUHCM",
        technical_skills: [
          "Docker", "GitHub", "GitLab CI/CD", "C++", "Go", "TypeScript", "Python", "JavaScript",
          "MySQL", "PostgreSQL", "MongoDB", "Pug", "React", "Next.js", "TailwindCSS", "Sass",
          "computer networks", "Linux operating systems"
        ],
        certificate: "IELTS 6.0",
        projects: [
          {
            project_name: "Tripzy",
            languages: ["ReactJS", "ExpressJS", "MongoDB"],
            description: "A friendly web travel booking platform.",
            team_size: 4,
            role: "UI Developer",
            duration: "Sep 2024 - Dec 2024"
          },
          {
            project_name: "Fincompass",
            languages: ["MySQL", "Java", "Spring Boot", "HTML", "CSS", "JavaScript"],
            description: "Engineered responsive user interfaces across all application pages...",
            team_size: 7,
            role: "UI Developer",
            duration: "Sep 2024 - Dec 2024"
          },
          {
            project_name: "HCMUT SPSS",
            languages: ["Python", "HTML", "CSS"],
            description: "Designed and developed the user interface (UI) for all pages...",
            team_size: 5,
            role: "UI Developer",
            duration: "Sep 2024 - Dec 2024"
          },
          {
            project_name: "FedMalDetect",
            languages: ["Python", "OpenFL"],
            description: "Applying Federated Learning for Android Malware Classification.",
            team_size: 2,
            role: "Researcher",
            duration: "Mar 2025 - Present"
          },
          {
            project_name: "Inventory Management System",
            languages: [
              "Java", "Spring Boot", "Spring Data JPA", "PostgreSQL",
              "React", "TypeScript", "Redux Toolkit"
            ],
            description: "Developed a web-based platform to manage warehouse inventory...",
            team_size: 3,
            role: "Full-stack Developer",
            duration: "Mar 2025 - Present"
          }
        ]
      };
      
      // Chuyển object thành chuỗi JSON
  const jsonString = JSON.stringify(sampleResumeInfo);
      
      

  const userInput = `\nInformation Resumes:\n${jsonString}`;

  const { req, res } = makeReqRes(userInput);
  await controller.sendMessage(req, res);
}

run().catch(err => { console.error(err); process.exit(1); });


