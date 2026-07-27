const https = require('https');

const JOBSEEKER_SUGGESTIONS = [
  'How do I apply for a job?',
  'How do I complete my profile?',
  'How do I track my application?',
  'How can I prepare for an interview?',
  'How can I increase my chances of getting hired?',
];

const EMPLOYER_SUGGESTIONS = [
  'How do I post a job?',
  'How do I manage applicants?',
  'How do I add a hiring stage?',
  'How do I schedule an interview?',
  'How do I update my company profile?',
];

const COMMON_GUIDES = [
  {
    keywords: ['notification', 'notifications', 'alert', 'updates'],
    answer:
      'To check your notifications:\n\n1. Sign in to your account.\n2. Select the notification bell in the navigation bar.\n3. Open a notification to view its details.\n4. Visit the related page when an action is required.',
  },
  {
    keywords: ['message', 'messages', 'chat', 'conversation'],
    answer:
      'To use Messages:\n\n1. Sign in to your account.\n2. Open Messages from the navigation menu.\n3. Select an existing conversation.\n4. Type your message in the message field.\n5. Select Send.\n\nJobseekers may need to wait for an employer to start the conversation first.',
  },
  {
    keywords: ['password', 'settings', 'account settings'],
    answer:
      'To manage your account settings:\n\n1. Sign in to your account.\n2. Open your profile menu.\n3. Select Account Settings or Settings.\n4. Update the available information.\n5. Save your changes.',
  },
];

const JOBSEEKER_GUIDES = [
  {
    keywords: ['apply', 'application', 'apply for a job', 'submit application'],
    answer:
      'To apply for a job:\n\n1. Sign in to your jobseeker account.\n2. Complete your profile and upload an updated resume.\n3. Open Job Offers.\n4. Search for a position that matches your skills.\n5. Open the job details and review the requirements.\n6. Select Apply Now.\n7. Review the information that will be submitted.\n8. Submit your application.\n9. Check My Applications for status updates.',
  },
  {
    keywords: ['complete my profile', 'update my profile', 'profile completion', 'jobseeker profile'],
    answer:
      'To complete your jobseeker profile:\n\n1. Open your profile menu.\n2. Select My Profile.\n3. Add your personal information, education, skills, and work experience.\n4. Upload a clear profile photo when required.\n5. Upload or update your resume.\n6. Review the information for accuracy.\n7. Save your changes.',
  },
  {
    keywords: ['track', 'status', 'my application', 'application status', 'pending', 'for interview', 'hired', 'declined'],
    answer:
      'To track an application:\n\n1. Open My Applications.\n2. Find the job you applied for.\n3. Review the status shown on the application card.\n4. Open the job when you need more details.\n5. Check Messages and Notifications for employer updates.\n\nCommon statuses include Pending, For Interview, Hired, and Declined.',
  },
  {
    keywords: ['interview', 'prepare for an interview', 'interview preparation'],
    answer:
      'To prepare for an interview:\n\n1. Review the job description and company information.\n2. Prepare a short introduction about yourself.\n3. Practice explaining your skills, education, and experience.\n4. Prepare examples of problems you solved.\n5. Confirm the interview date, time, location, or meeting link.\n6. Prepare your resume and required documents.\n7. Join or arrive early.\n8. Ask clear questions about the role before the interview ends.',
  },
  {
    keywords: ['get hired', 'getting hired', 'increase my chances', 'chance of getting hired', 'how to be hired'],
    answer:
      'To increase your chances of getting hired:\n\n1. Complete every important part of your profile.\n2. Use an updated and easy-to-read resume.\n3. Add skills that honestly match your experience.\n4. Apply only to jobs that fit your qualifications.\n5. Read every job requirement before submitting.\n6. Check Messages, Notifications, and My Applications regularly.\n7. Reply professionally when an employer contacts you.\n8. Prepare carefully for interviews and assessments.\n9. Be honest, punctual, and professional throughout the hiring process.',
  },
  {
    keywords: ['resume', 'cv', 'upload resume'],
    answer:
      'To prepare and upload your resume:\n\n1. Keep your contact information updated.\n2. Add your education, skills, experience, and relevant achievements.\n3. Use clear headings and simple formatting.\n4. Check spelling and dates.\n5. Open My Profile.\n6. Upload the latest version of your resume.\n7. Preview it before applying for a job.',
  },
  {
    keywords: ['bookmark', 'saved job', 'save a job'],
    answer:
      'To save a job for later:\n\n1. Open Job Offers.\n2. Find the job you want to save.\n3. Select the bookmark icon on the job card or job details page.\n4. Open Bookmarks from your profile menu to view saved jobs.',
  },
  {
    keywords: ['company', 'companies', 'view company'],
    answer:
      'To explore companies:\n\n1. Open Companies from the navigation bar.\n2. Use the available search and location filters.\n3. Select a company card.\n4. Review the company profile and available job offers.',
  },
];

const EMPLOYER_GUIDES = [
  {
    keywords: ['post a job', 'create a job', 'job posting', 'publish job'],
    answer:
      'To post a job:\n\n1. Sign in to your employer account.\n2. Open Post Jobs.\n3. Enter the job title and basic information.\n4. Select the employment type and work mode.\n5. Add the vacancy count and application deadline.\n6. Enter the salary range.\n7. Add applicant requirements, skills, responsibilities, and job details.\n8. Review the posting using Preview.\n9. Select Save Draft or Publish Job.',
  },
  {
    keywords: ['manage job', 'manage jobs', 'edit job', 'archive job'],
    answer:
      'To manage a job posting:\n\n1. Open Manage Jobs.\n2. Find the job posting you want to manage.\n3. Open the available action menu.\n4. View, edit, publish, close, or archive the job when those actions are available.\n5. Confirm important changes before leaving the page.',
  },
  {
    keywords: ['manage applicant', 'manage applicants', 'review applicant', 'applicants'],
    answer:
      'To manage applicants:\n\n1. Open Applicants.\n2. Select the job posting you want to review.\n3. Open an applicant record.\n4. Review the submitted profile, resume, and application details.\n5. Update the application status or hiring stage.\n6. Send a message when follow-up is needed.\n7. Continue monitoring the applicant until the process is completed.',
  },
  {
    keywords: ['hiring stage', 'add a stage', 'assessment stage', 'change stage'],
    answer:
      'To update a hiring stage:\n\n1. Open the applicant list or the For Interview page.\n2. Select the applicant you want to update.\n3. Open the action menu.\n4. Select Change Hiring Stage.\n5. Choose an existing stage or add the required stage, such as Assessment.\n6. Save the change.\n7. Confirm that the applicant now shows the correct stage number and name.',
  },
  {
    keywords: ['schedule interview', 'interview schedule', 'set interview'],
    answer:
      'To schedule an interview:\n\n1. Open the applicant or conversation.\n2. Select the interview scheduling option.\n3. Choose the date and time.\n4. Select the meeting type or location.\n5. Add the interviewer and notes when needed.\n6. Review the details.\n7. Send or save the interview schedule.\n8. Confirm that the jobseeker received the schedule in Messages or Notifications.',
  },
  {
    keywords: ['company profile', 'update company', 'verification documents', 'verify company'],
    answer:
      'To update your company profile:\n\n1. Open Company Profile.\n2. Update the company name, industry, description, location, logo, and other available information.\n3. Upload the required verification documents when requested.\n4. Review all information for accuracy.\n5. Save your changes.\n6. Check the verification status for further instructions.',
  },
  {
    keywords: ['hired', 'hire applicant', 'mark as hired'],
    answer:
      'To complete the hiring process:\n\n1. Review the applicant information and completed hiring stages.\n2. Confirm that all required interviews or assessments are finished.\n3. Open the applicant action menu.\n4. Change the application status to Hired when appropriate.\n5. Send the applicant a clear message about the next steps.',
  },
];

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const findStaticAnswer = (message, role) => {
  const normalizedMessage = normalizeText(message);
  const roleGuides = role === 'employer' ? EMPLOYER_GUIDES : JOBSEEKER_GUIDES;
  const guides = [...roleGuides, ...COMMON_GUIDES];

  let bestMatch = null;
  let bestScore = 0;

  guides.forEach((guide) => {
    const score = guide.keywords.reduce((total, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) return total;
      if (normalizedMessage.includes(normalizedKeyword)) {
        return total + Math.max(2, normalizedKeyword.split(' ').length);
      }

      const keywordWords = normalizedKeyword.split(' ');
      const matchedWords = keywordWords.filter((word) =>
        normalizedMessage.split(' ').includes(word)
      ).length;
      return total + matchedWords * 0.5;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = guide;
    }
  });

  if (bestMatch && bestScore >= 1) return bestMatch.answer;

  return (
    'I could not find a prepared system guide for that question yet. ' +
    'The full AI assistant will be available once the AI service and API credits are activated. ' +
    'For now, please try one of the suggested questions.'
  );
};

const buildSystemInstructions = (role) => {
  const roleName = role === 'employer' ? 'employer' : 'jobseeker';

  return `You are Agap-AI, the official assistant of the AGAPAY job portal.

Your current user is a ${roleName}.

Rules:
1. Answer in clear, simple English.
2. Use numbered step-by-step instructions when explaining a process.
3. Help only with job portal usage, job searching, applications, profiles, resumes, hiring, applicant management, and interview preparation.
4. Never claim that you checked private account data, application status, messages, or database records.
5. Never invent a system button, page, rule, or result.
6. When you are not certain about a system-specific detail, clearly say that the user should check the relevant page or contact support.
7. Do not request passwords, API keys, payment details, government IDs, or other sensitive information.
8. Keep the response practical and concise.
9. Do not perform account changes or application actions.
10. The portal includes Job Offers, Companies, Messages, Notifications, profiles, applications, and role-specific dashboard tools.`;
};

const extractResponseText = (payload) => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const textParts = [];

  output.forEach((item) => {
    const content = Array.isArray(item?.content) ? item.content : [];
    content.forEach((part) => {
      if (part?.type === 'output_text' && typeof part?.text === 'string') {
        textParts.push(part.text);
      }
    });
  });

  return textParts.join('\n').trim();
};

const requestOpenAIResponse = ({ message, role, history }) =>
  new Promise((resolve, reject) => {
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .map((entry) => ({
            role: entry?.role === 'assistant' ? 'assistant' : 'user',
            content: String(entry?.content || '').slice(0, 1500),
          }))
          .filter((entry) => entry.content.trim())
      : [];

    const conversation = safeHistory
      .map((entry) => `${entry.role === 'assistant' ? 'Assistant' : 'User'}: ${entry.content}`)
      .join('\n\n');

    const input = conversation
      ? `Conversation:\n${conversation}\n\nLatest user question:\n${message}`
      : message;

    const requestBody = JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      instructions: buildSystemInstructions(role),
      input,
      max_output_tokens: 600,
    });

    const request = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/responses',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
        timeout: 60000,
      },
      (response) => {
        let responseBody = '';

        response.on('data', (chunk) => {
          responseBody += chunk;
        });

        response.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseBody || '{}');
          } catch {
            return reject(new Error('The AI service returned an invalid response.'));
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            const apiMessage = parsed?.error?.message || 'The AI service request failed.';
            const error = new Error(apiMessage);
            error.statusCode = response.statusCode;
            return reject(error);
          }

          const reply = extractResponseText(parsed);
          if (!reply) {
            return reject(new Error('The AI service did not return an answer.'));
          }

          resolve(reply);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('The AI service request timed out.'));
    });

    request.on('error', reject);
    request.write(requestBody);
    request.end();
  });

exports.getChatbotStatus = async (req, res) => {
  const configuredMode = String(process.env.CHATBOT_MODE || 'static').toLowerCase();
  const aiReady = configuredMode === 'ai' && Boolean(process.env.OPENAI_API_KEY);

  return res.json({
    success: true,
    mode: aiReady ? 'ai' : 'static',
    aiReady,
    suggestions:
      req.user?.role === 'employer' ? EMPLOYER_SUGGESTIONS : JOBSEEKER_SUGGESTIONS,
  });
};

exports.sendChatbotMessage = async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const authenticatedRole = String(req.user?.role || '').trim().toLowerCase();
    const role = authenticatedRole === 'employer' ? 'employer' : 'jobseeker';

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a question for Agap-AI.',
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Your question is too long. Please keep it under 1,000 characters.',
      });
    }

    const configuredMode = String(process.env.CHATBOT_MODE || 'static').toLowerCase();
    const aiEnabled = configuredMode === 'ai' && Boolean(process.env.OPENAI_API_KEY);

    if (!aiEnabled) {
      return res.json({
        success: true,
        mode: 'static',
        reply: findStaticAnswer(message, role),
      });
    }

    try {
      const reply = await requestOpenAIResponse({
        message,
        role,
        history: req.body?.history,
      });

      return res.json({
        success: true,
        mode: 'ai',
        reply,
      });
    } catch (aiError) {
      console.error('Agap-AI request failed:', {
        message: aiError?.message,
        statusCode: aiError?.statusCode,
      });

      return res.json({
        success: true,
        mode: 'static-fallback',
        reply: findStaticAnswer(message, role),
      });
    }
  } catch (error) {
    console.error('Chatbot controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Agap-AI is temporarily unavailable. Please try again later.',
    });
  }
};
