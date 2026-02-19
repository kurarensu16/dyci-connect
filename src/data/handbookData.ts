
export interface HandbookSection {
    id: string
    title: string
    content: string // HTML or Markdown string
}

export interface HandbookChapter {
    id: number
    title: string
    subtitle: string
    icon?: string // Optional icon name
    sections: HandbookSection[]
}

export const handbookData: HandbookChapter[] = [
    {
        id: 1,
        title: 'CHAPTER 1',
        subtitle: 'INTRODUCTION',
        sections: [
            {
                id: '1.1',
                title: 'History of the College',
                content: `
          <p>The Dr. Yanga's Colleges, Inc. (formerly Dr. Yanga's Francisco Balagtas Colleges) was founded in 1950...</p>
          <p>It started as a small institution dedicated to providing quality education to the youth of Bulacan.</p>
        `,
            },
            {
                id: '1.2',
                title: 'Philosophy, Vision, and Mission',
                content: `
          <h3 class="font-bold text-lg mb-2">Philosophy</h3>
          <p class="mb-4">Education is a lifelong process of growth...</p>
          
          <h3 class="font-bold text-lg mb-2">Vision</h3>
          <p class="mb-4">We envision DYCI as a center of excellence...</p>

          <h3 class="font-bold text-lg mb-2">Mission</h3>
          <p>To provide quality instruction, research, and community extension services...</p>
        `,
            },
            {
                id: '1.3',
                title: 'College Seal and Colors',
                content: `
          <p>The College Seal represents the ideals and aspirations of the institution.</p>
          <p><strong>Blue</strong> stands for loyalty and justice.</p>
          <p><strong>White</strong> stands for purity and integrity.</p>
        `,
            },
        ],
    },
    {
        id: 2,
        title: 'CHAPTER 2',
        subtitle: 'ADMISSION AND REGISTRATION',
        sections: [
            {
                id: '2.1',
                title: 'Admission Requirements',
                content: `
          <ul class="list-disc pl-5 space-y-2">
            <li>Form 138 (Report Card)</li>
            <li>Certificate of Good Moral Character</li>
            <li>Birth Certificate (PSA)</li>
            <li>2x2 ID Pictures</li>
          </ul>
        `,
            },
            {
                id: '2.2',
                title: 'Enrollment Procedure',
                content: `
          <ol class="list-decimal pl-5 space-y-2">
            <li>Present credentials to the Registrar's Office.</li>
            <li>Pay the assessment fee at the Cashier.</li>
            <li>Proceed to the College Dean for advising.</li>
          </ol>
        `,
            },
        ],
    },
    {
        id: 3,
        title: 'CHAPTER 3',
        subtitle: 'ACADEMIC POLICIES',
        sections: [
            {
                id: '3.1',
                title: 'Grading System',
                content: `
          <table class="w-full text-sm border-collapse border border-slate-200">
            <thead>
              <tr class="bg-slate-100">
                <th class="border border-slate-200 px-2 py-1">Grade</th>
                <th class="border border-slate-200 px-2 py-1">Equivalent</th>
                <th class="border border-slate-200 px-2 py-1">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-slate-200 px-2 py-1">1.00</td>
                <td class="border border-slate-200 px-2 py-1">99-100</td>
                <td class="border border-slate-200 px-2 py-1">Excellent</td>
              </tr>
              <tr>
                <td class="border border-slate-200 px-2 py-1">1.25</td>
                <td class="border border-slate-200 px-2 py-1">96-98</td>
                <td class="border border-slate-200 px-2 py-1">Superior</td>
              </tr>
               <tr>
                <td class="border border-slate-200 px-2 py-1">5.00</td>
                <td class="border border-slate-200 px-2 py-1">Below 75</td>
                <td class="border border-slate-200 px-2 py-1">Failed</td>
              </tr>
            </tbody>
          </table>
        `,
            },
            {
                id: '3.2',
                title: 'Academic Retention',
                content: '<p>Students must maintain a weighted average of...</p>',
            },
        ],
    },
    {
        id: 4,
        title: 'CHAPTER 4',
        subtitle: 'STUDENT CONDUCT AND DISCIPLINE',
        sections: [
            {
                id: '4.1',
                title: 'Code of Conduct',
                content: '<p>All students are expected to conduct themselves with...</p>',
            },
            {
                id: '4.2',
                title: 'Disciplinary Sanctions',
                content: '<p>Violations of the code of conduct may result in...</p>',
            },
        ],
    },
]
