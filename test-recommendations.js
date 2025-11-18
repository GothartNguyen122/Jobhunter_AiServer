#!/usr/bin/env node

/**
 * Simple script to test the /api/v1/recommendations endpoint served by Jobhunter_AiServer.
 *
 * Usage:
 *   node test-recommendations.js [--server http://localhost:3005]
 *
 * You can override the target server via the --server flag or the RECOMMENDATION_TEST_SERVER env var.
 */

const axios = require('axios');

const DEFAULT_SERVER = 'http://localhost:3005';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--server' || arg === '-s') && i + 1 < args.length) {
      parsed.server = args[++i];
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();
  const server =
    args.server || process.env.RECOMMENDATION_TEST_SERVER || DEFAULT_SERVER;

  const payload = {
    keyword: '',
    location: 'HOCHIMINH',
    skills: '.NET Core',
    minSalary: 0,
    maxSalary: 100000000,
    level: 'JUNIOR',
    page: 1,
    size: 10,
    sort: 'updatedAt,desc',
    resumeData: {
      full_name: 'Nguyen Van A',
      objective:
        'Kỹ sư phần mềm với 3 năm kinh nghiệm phát triển ứng dụng .NET và React.',
      phone_number: '0123456789',
      email: 'nguyenvana@example.com',
      technical_skills: ['.NET Core', 'C#', 'ReactJS', 'SQL'],
      projects: [
        {
          project_name: 'Recruitment Portal',
          languages: ['.NET Core', 'ReactJS', 'SQL Server'],
          description:
            'Xây dựng nền tảng tuyển dụng với tính năng gợi ý công việc cho ứng viên.',
          team_size: 4,
          role: 'Fullstack Developer',
          duration: '01/2023 - 08/2023'
        }
      ]
    }
  };

  const url = `${server.replace(/\/$/, '')}/api/v1/recommendations`;

  console.log('======================================');
  console.log('Testing recommendations endpoint');
  console.log('Server :', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('======================================\n');

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('>>> Response status:', response.status);
    console.log('>>> Response body :', JSON.stringify(response.data.data.result, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('>>> Request failed with status:', error.response.status);
      console.error(
        '>>> Response body:',
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error('>>> Request error:', error.message);
    }
    process.exitCode = 1;
  }
}

main();


