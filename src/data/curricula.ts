export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  conceptTag: string;
  explanation: string;
}

export interface Chapter {
  chapter_number: number;
  chapter_name: string;
  questions: MCQQuestion[];
}

export interface SubjectCurriculum {
  class: number;
  subject: string;
  chapters?: Chapter[];
  MCQs?: MCQQuestion[];
}

export const CURRICULA_DATABASE: SubjectCurriculum[] = [
  // =========================================================================
  // CLASS 9 CURRICULA
  // =========================================================================
  {
    class: 9,
    subject: "Mathematics",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Orienting Yourself: The Use of Coordinates",
        questions: [
          {
            id: "c9_math_coord_01",
            question: "What are the coordinates of the origin where the horizontal and vertical reference axes intersect in a Cartesian plane?",
            options: ["(0, 0)", "(1, 1)", "(0, 1)", "(1, 0)"],
            correctAnswer: "(0, 0)",
            conceptTag: "Origin Coordinates",
            explanation: "The point of intersection of the x-axis and y-axis is defined as the origin, represented by (0, 0)."
          },
          {
            id: "c9_math_coord_02",
            question: "If a point has a negative abscissa (x < 0) and a positive ordinate (y > 0), in which quadrant does it lie?",
            options: ["Quadrant II", "Quadrant I", "Quadrant III", "Quadrant IV"],
            correctAnswer: "Quadrant II",
            conceptTag: "Quadrant Sign Conventions",
            explanation: "Quadrant II contains points where x is negative and y is positive (-x, +y)."
          }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: "Introduction to Linear Polynomials",
        questions: [
          {
            id: "c9_math_poly_01",
            question: "What is the degree of a linear polynomial in one variable?",
            options: ["1", "0", "2", "Undefined"],
            correctAnswer: "1",
            conceptTag: "Degree of Linear Polynomials",
            explanation: "A linear polynomial has the general form p(x) = ax + b (where a ≠ 0), which has a highest variable exponent of 1."
          }
        ]
      }
    ]
  },
  {
    class: 9,
    subject: "Science",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Exploration: Entering the World of Secondary Science",
        questions: [
          {
            id: "c9_sci_exp_01",
            question: "In a controlled scientific experiment, what is the 'independent variable'?",
            options: [
              "The factor that is deliberately manipulated or changed by the experimenter",
              "The outcome that is measured at the end of the experiment",
              "The factor that is kept strictly constant throughout all trials",
              "A random error caused by faulty lab equipment"
            ],
            correctAnswer: "The factor that is deliberately manipulated or changed by the experimenter",
            conceptTag: "Independent vs Dependent Variables",
            explanation: "The independent variable is the input systematically altered by the scientist to observe its effect on the dependent variable."
          }
        ]
      }
    ]
  },
  {
    class: 9,
    subject: "SST",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "The French Revolution",
        questions: [
          {
            id: "c9_sst_ch01_01",
            question: "On which date did the storming of the Bastille prison take place, marking the outbreak of the French Revolution?",
            options: ["14 July 1789", "5 May 1789", "4 August 1789", "21 September 1792"],
            correctAnswer: "14 July 1789",
            conceptTag: "Outbreak of the French Revolution",
            explanation: "The fortress-prison Bastille was stormed by angry crowds on 14 July 1789, symbolizing the end of despotic royal power."
          }
        ]
      }
    ]
  },
  {
    class: 9,
    subject: "English",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Sequence of Tenses",
        questions: [
          {
            id: "c9_eng_sot_01",
            question: "Choose the correct verb form: 'The patient ______ before the doctor arrived at the hospital.'",
            options: ["had died", "died", "has died", "was dying"],
            correctAnswer: "had died",
            conceptTag: "Past Perfect for Earlier Past Action",
            explanation: "When two actions occur in the past, the earlier action takes the Past Perfect ('had died') and the later action takes the Simple Past ('arrived')."
          }
        ]
      }
    ]
  },
  {
    class: 9,
    subject: "Hindi",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "शब्द निर्माण — उपसर्ग, प्रत्यय",
        questions: [
          {
            id: "c9_hin_up1_01",
            question: "'अत्याचार' शब्द में प्रयुक्त सही उपसर्ग और मूल शब्द का चयन कीजिए:",
            options: ["अति + आचार", "अत्य + आचार", "अ + त्याचार", "अति + चार"],
            correctAnswer: "अति + आचार",
            conceptTag: "यण संधि युक्त उपसर्ग पहचान",
            explanation: "'अत्याचार' में 'अति' उपसर्ग और 'आचार' मूल शब्द है (इ + आ = या)।"
          }
        ]
      }
    ]
  },

  // =========================================================================
  // CLASS 10 CURRICULA
  // =========================================================================
  {
    class: 10,
    subject: "Mathematics",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Real Numbers",
        questions: [
          {
            id: "c10_m_rn_01",
            question: "If p is a prime number and p divides a², where a is a positive integer, what does the Fundamental Theorem of Arithmetic guarantee?",
            options: ["p must divide a", "p² must divide a", "p must divide √a", "a must be equal to p"],
            correctAnswer: "p must divide a",
            conceptTag: "Divisibility of Primes",
            explanation: "If a prime p divides the square of an integer, it must also divide the integer itself according to prime factorization properties."
          }
        ]
      }
    ]
  },
  {
    class: 10,
    subject: "Science",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Chemical Reactions and Equations",
        questions: [
          {
            id: "c10_sci_cre_01",
            question: "Which of the following observations confirms that a chemical reaction has definitely taken place?",
            options: [
              "Evolution of a new gas with distinct chemical properties",
              "Only change in the physical state of matter",
              "Dissolution of sugar in water",
              "Melting of wax"
            ],
            correctAnswer: "Evolution of a new gas with distinct chemical properties",
            conceptTag: "Chemical vs Physical Change",
            explanation: "Evolution of a new chemically distinct gas or formation of a precipitate indicates bond breaking and forming."
          }
        ]
      }
    ]
  },
  {
    class: 10,
    subject: "SST",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "The Rise of Nationalism in Europe",
        questions: [
          {
            id: "c10_sst_hist1_01",
            question: "What was the main purpose of the Civil Code of 1804 (Napoleonic Code)?",
            options: [
              "Abolished privileges based on birth and established equality before law",
              "Restored absolute monarchies across European territories",
              "Granted universal adult suffrage to all women and men",
              "Enforced feudal serfdom across conquered states"
            ],
            correctAnswer: "Abolished privileges based on birth and established equality before law",
            conceptTag: "Napoleonic Code Reforms",
            explanation: "The Civil Code of 1804 removed feudal privileges, secured property rights, and established legal equality."
          }
        ]
      }
    ]
  },
  {
    class: 10,
    subject: "English",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Determiners",
        questions: [
          {
            id: "c10_eng_det_01",
            question: "Choose the appropriate quantifier: 'There is ______ hope of his recovery; the doctors have given up.'",
            options: ["little", "a little", "the little", "few"],
            correctAnswer: "little",
            conceptTag: "Little vs A Little vs Few",
            explanation: "'Hope' is uncountable. 'Little' (without article) means 'hardly any / almost zero' (negative sense)."
          }
        ]
      }
    ]
  },
  {
    class: 10,
    subject: "Hindi",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "रचना के आधार पर वाक्य भेद",
        questions: [
          {
            id: "c10_ha_vak_01",
            question: "जैसे ही मुख्य अतिथि मंच पर आए, वैसे ही दर्शकों ने खड़े होकर तालियाँ बजाईं। रचना की दृष्टि से यह किस प्रकार का वाक्य है?",
            options: ["मिश्र वाक्य", "संयुक्त वाक्य", "सरल वाक्य", "इच्छावाचक वाक्य"],
            correctAnswer: "मिश्र वाक्य",
            conceptTag: "मिश्र वाक्य पहचान",
            explanation: "जहाँ एक प्रधान उपवाक्य हो और अन्य उपवाक्य उसपर आश्रित हों, वहाँ मिश्र वाक्य होता है।"
          }
        ]
      }
    ]
  },

  // =========================================================================
  // CLASS 11 CURRICULA
  // =========================================================================
  {
    class: 11,
    subject: "Physics",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Units and Measurements",
        questions: [
          {
            id: "c11_phy_ch01_01",
            question: "Which of the following physical quantities has the same dimensions as Planck's constant (h)?",
            options: ["Linear momentum", "Angular momentum", "Torque", "Pressure"],
            correctAnswer: "Angular momentum",
            conceptTag: "Dimensional Analysis",
            explanation: "Planck's constant has dimensions [ML^2T^-1], which is identical to angular momentum."
          }
        ]
      }
    ]
  },
  {
    class: 11,
    subject: "Chemistry",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Some Basic Concepts of Chemistry",
        questions: [
          {
            id: "c11_chem_ch01_01",
            question: "What is the mass of 1 molecule of water (H2O)?",
            options: ["3.0 x 10^-23 g", "1.8 x 10^-24 g", "6.023 x 10^-23 g", "1.0 x 10^-22 g"],
            correctAnswer: "3.0 x 10^-23 g",
            conceptTag: "Mole Concept",
            explanation: "Molar mass of H2O = 18 g/mol. Mass of 1 molecule = 18 / (6.022 × 10^23) ≈ 3.0 × 10^-23 g."
          }
        ]
      }
    ]
  },
  {
    class: 11,
    subject: "Biology",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "The Living World",
        questions: [
          {
            id: "c11_bio_ch01_01",
            question: "Which of the following defines the term 'taxa' in biological classification?",
            options: ["A scientific name of an organism", "A taxonomic group of any rank", "The species-specific epithet", "A rank restricted only to species level"],
            correctAnswer: "A taxonomic group of any rank",
            conceptTag: "Taxonomic Hierarchy",
            explanation: "A taxon represents any unit or category of the taxonomic hierarchy at any level of classification."
          }
        ]
      }
    ]
  },
  {
    class: 11,
    subject: "Economics",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Introduction",
        questions: [
          {
            id: "c11_eco_ch01_01",
            question: "What does statistics mean in the plural sense?",
            options: ["Statistical methods", "Numerical data collected in a systematic manner", "Statistical analysis", "Probability theory"],
            correctAnswer: "Numerical data collected in a systematic manner",
            conceptTag: "Meaning of Statistics",
            explanation: "In the plural sense, statistics refers to numerical facts or data collected systematically."
          }
        ]
      }
    ]
  },
  {
    class: 11,
    subject: "Accountancy",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Introduction to Accounting",
        questions: [
          {
            id: "c11_acc_ch01_01",
            question: "Which of the following is considered the language of business?",
            options: ["Economics", "Accounting", "Statistics", "Mathematics"],
            correctAnswer: "Accounting",
            conceptTag: "Introduction to Accounting",
            explanation: "Accounting is often termed the 'language of business' because it communicates financial information."
          }
        ]
      }
    ]
  },
  {
    class: 11,
    subject: "Business Studies",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Nature and Purpose of Business",
        questions: [
          {
            id: "c11_bst_ch01_01",
            question: "Which of the following is not considered a characteristic of business activities?",
            options: [
              "Production or procurement of goods and services",
              "Sale or exchange of goods and services for satisfaction of personal consumption without profit motive",
              "Dealing in goods and services on a regular basis",
              "Profit earning motive"
            ],
            correctAnswer: "Sale or exchange of goods and services for satisfaction of personal consumption without profit motive",
            conceptTag: "Characteristics of Business",
            explanation: "A business activity must involve a profit motive."
          }
        ]
      }
    ]
  },

  // =========================================================================
  // CLASS 12 CURRICULA
  // =========================================================================
  {
    class: 12,
    subject: "Physics",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Electric Charges and Fields",
        questions: [
          {
            id: "c12_phy_ch01_01",
            question: "What is the SI unit of electric flux?",
            options: ["N m^2 C^-1", "N m C^-1", "V m^-1", "C^2 N^-1 m^-2"],
            correctAnswer: "N m^2 C^-1",
            conceptTag: "Electric Flux",
            explanation: "Electric flux Φ = E · A, giving N m^2 C^-1."
          }
        ]
      }
    ]
  },
  {
    class: 12,
    subject: "Chemistry",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Solutions",
        questions: [
          {
            id: "c12_chem_ch01_01",
            question: "Which of the following colligative properties is most suitable for determining the molar mass of polymers and proteins?",
            options: ["Relative lowering of vapour pressure", "Elevation in boiling point", "Depression in freezing point", "Osmotic pressure"],
            correctAnswer: "Osmotic pressure",
            conceptTag: "Colligative Properties",
            explanation: "Osmotic pressure is measured at room temperature and uses molar concentration, ideal for large molecules."
          }
        ]
      }
    ]
  },
  {
    class: 12,
    subject: "Biology",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Sexual Reproduction in Flowering Plants",
        questions: [
          {
            id: "c12_bio_ch01_01",
            question: "Transfer of pollen grains from the anther to the stigma of another flower of the same plant is called:",
            options: ["Autogamy", "Geitonogamy", "Xenogamy", "Cleistogamy"],
            correctAnswer: "Geitonogamy",
            conceptTag: "Pollination Types",
            explanation: "Geitonogamy involves pollen transfer between flowers on the same plant."
          }
        ]
      }
    ]
  },
  {
    class: 12,
    subject: "Economics",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "National Income and Related Aggregates",
        questions: [
          {
            id: "c12_eco_ch01_01",
            question: "Which of the following is a stock variable?",
            options: ["National income", "Capital", "Savings", "Investment"],
            correctAnswer: "Capital",
            conceptTag: "Stock and Flow Variables",
            explanation: "A stock variable is measured at a specific point in time (e.g., capital, wealth)."
          }
        ]
      }
    ]
  },
  {
    class: 12,
    subject: "Accountancy",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Accounting for Partnership: Basic Concepts",
        questions: [
          {
            id: "c12_acc_ch01_01",
            question: "Interest on partner's capital is treated as which of the following when provided in the partnership deed?",
            options: ["Charge against profit", "Appropriation of profit", "Direct expense", "Capital reduction"],
            correctAnswer: "Appropriation of profit",
            conceptTag: "Partnership Basic Concepts",
            explanation: "Unless explicitly stated as a charge against profit, interest on capital is an appropriation of profit."
          }
        ]
      }
    ]
  },
  {
    class: 12,
    subject: "Business Studies",
    chapters: [
      {
        chapter_number: 1,
        chapter_name: "Nature and Significance of Management",
        questions: [
          {
            id: "c12_bst_ch01_01",
            question: "Management is considered a dynamic function because:",
            options: [
              "It adapts to changing external environment",
              "It remains rigid and static",
              "It focuses only on past records",
              "It is performed by top management alone"
            ],
            correctAnswer: "It adapts to changing external environment",
            conceptTag: "Nature of Management",
            explanation: "Management adapts to the constantly changing environment."
          }
        ]
      }
    ]
  }
];

export function getCurriculumByClassAndSubject(classNum: number, subjectName: string): SubjectCurriculum | undefined {
  return CURRICULA_DATABASE.find(
    (c) => c.class === classNum && c.subject.toLowerCase() === subjectName.toLowerCase()
  );
}