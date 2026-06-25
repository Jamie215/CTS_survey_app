 export const diagnosticQuestions = [
    { id: 0, number: '1', text: "Do you ever have numbness and tingling in your fingers?", hasNumbnessOrTingling: true , field: 'kamath_numbOrTingle'},
    { id: 1, number: '1a', text: "Do you wake up because of tingling or numbness in your fingers?", requiresNumbnessOrTingling: true, field: 'kamath_numbOrTingle_wakeUp' },
    { id: 2, number: '1b', text: "Do you have tingling or numbness in your fingers when you first wake up?", requiresNumbnessOrTingling: true, field: 'kamath_numbOrTingle_firstWakeUp' },
    { id: 3, number: '1c', text: "Is your numbness or tingling mainly in your thumb, index, and/or middle finger?", requiresNumbnessOrTingling: true, field: 'kamath_numbOrTingle_thumbIndexMiddle' },
    { id: 4, number: '1d', text: "Do you have any quick movements or positions that relieve your tingling or numbness?", requiresNumbnessOrTingling: true, field: 'kamath_numbOrTingle_quickMovements' },
    { id: 5, number: '1e', text: "Do you have numbness or tingling in your little (small/pinky) finger?", requiresNumbnessOrTingling: true, field: 'kamath_numbOrTingle_littleFinger' },
    { id: 6, number: '1f', text: "Do certain activities (for example, holding objects or repetitive finger movement) increase the numbness or tingling in your fingers?", requiresNumbnessOrTingling: true, field: 'kamath_numbOrTingle_certainActivities' },
    { id: 7, number: '2', text: "Did you have numbness or tingling in your fingers when you were pregnant? (If relevant)", hasNotRelevant: true, field: 'kamath_numbOrTingle_pregnant' },
    { id: 8, number: '3', text: "Do you have pain in your wrist?", field: 'kamath_wristPain' },
    { id: 9, number: '4', text: "Do you drop small objects like coins or a cup?", field: 'kamath_dropObjects' },
    { id: 10, number: '5', text: "Do you often have neck pain?", field: 'kamath_neckPain' },
    { id: 11, number: '6', text: "Do you have numbness or tingling in your toes?", field: 'kamath_toesNumbOrTingle' },
    { id: 12, number: '7', text: "Have you tried a wrist support brace / splint?", field: 'kamath_splintTried' },
    { id: 13, number: '7a', text: "Was the wrist support brace / splint effective or helpful?", requiresSplintTried: true, field: 'kamath_splintEffectiveness' }
  ];
