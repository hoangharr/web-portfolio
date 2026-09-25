import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const specs = [
  {
    id: "people-appearance-01", level: "A1", title: "People & Appearance", icon: "face", subtitle: "Describe people clearly and politely",
    vocab: [["tall","having more than average height","cao"],["short","having less than average height","thấp"],["young","not old","trẻ"],["friendly","kind and pleasant","thân thiện"],["quiet","not talking very much","ít nói"],["curly hair","hair with curls","tóc xoăn"],["wear glasses","have glasses on your face","đeo kính"],["look like","have a similar appearance","trông giống"]],
    grammar: [["Be for description","subject + am/is/are + adjective",["My brother is tall.","They are very friendly."]],["Have and has","I/you/we/they have; he/she has",["She has curly hair.","They have brown eyes."]],["Pronouns and possessives","subject pronoun + possessive adjective",["He is my uncle.","Her hair is short."]]],
    listening: "This is my friend Nina. She is twenty years old and she is quite tall. She has long curly hair and wears glasses. Nina is friendly, but she is quiet when she meets new people. She loves drawing portraits. Her younger brother, Leo, looks like her, but he has short straight hair. He is very talkative and often makes everyone laugh.",
    gist: ["What is the speaker mainly doing?",["Describing two people","Giving directions","Ordering food"],0], detail: ["How is Nina different when meeting new people?",["She is noisy","She is quiet","She is angry"],1],
    reading: ["Sam is my new classmate. He is ","friendly"," and helpful. He has short dark hair and ","wears"," glasses. His sister is tall, but Sam is quite ","short",". They both love music."],
    speaking: ["Describe a friend or family member.","What does this person look like?","What is this person like?"], sample: "My cousin Minh is twenty-two years old. He is tall and has short black hair. He wears glasses. He is friendly and very funny, but he is sometimes quiet with new people.",
    writing: "Write a short profile of a person you know. Describe appearance and personality.", grammarCheck: ["My sister ___ curly hair.",["have","has","is"],1]
  },
  {
    id: "places-directions-01", level: "A1", title: "Places & Directions", icon: "map", subtitle: "Find places and give simple directions",
    vocab: [["bank","a place that manages money","ngân hàng"],["pharmacy","a shop that sells medicine","nhà thuốc"],["library","a place where people borrow books","thư viện"],["opposite","on the other side","đối diện"],["between","in the middle of two things","ở giữa"],["next to","beside something","bên cạnh"],["turn left","go to the left side","rẽ trái"],["go straight","continue without turning","đi thẳng"]],
    grammar: [["There is / There are","there is + singular; there are + plural",["There is a bank near here.","There are two cafés."]],["Place prepositions","next to, between, opposite, behind",["The pharmacy is opposite the bank.","The café is between the shops."]],["Direction imperatives","base verb for instructions",["Go straight for 100 metres.","Turn left at the library."]]],
    listening: "Excuse me, is there a pharmacy near here? Yes. Go straight along King Street and turn left at the library. There is a small supermarket on the corner. The pharmacy is next to it, opposite the bank. It takes about five minutes to walk there. Thank you. You're welcome.",
    gist: ["What does the visitor need?",["A pharmacy","A station","A restaurant"],0], detail: ["Where should the visitor turn left?",["At the bank","At the library","At the supermarket"],1],
    reading: ["The town library is ","opposite"," the park. There is a café ","next to"," the library. To reach the bank, go ","straight"," and turn right at the traffic lights."],
    speaking: ["Describe your neighbourhood.","What places are near your home?","Give directions to one place."], sample: "There is a supermarket near my home. It is opposite a small park and next to a pharmacy. To get there, go straight along my street and turn right at the bank.",
    writing: "Write directions from your home to a nearby place.", grammarCheck: ["There ___ two cafés near the station.",["is","are","be"],1]
  },
  {
    id: "free-time-weather-01", level: "A1", title: "Free Time & Weather", icon: "sunny", subtitle: "Talk about abilities, hobbies and what is happening now",
    vocab: [["sunny","bright with light from the sun","có nắng"],["cloudy","covered with clouds","nhiều mây"],["rainy","with a lot of rain","có mưa"],["go cycling","ride a bicycle for pleasure","đạp xe"],["take photos","use a camera to make pictures","chụp ảnh"],["play chess","play a board game","chơi cờ"],["indoors","inside a building","trong nhà"],["outdoors","outside a building","ngoài trời"]],
    grammar: [["Like + -ing","like/love/enjoy + verb-ing",["I like taking photos.","She loves playing chess."]],["Can and can't","can/can't + base verb",["I can swim.","He can't ride a bike."]],["Present continuous","am/is/are + verb-ing for now",["It is raining now.","We are playing indoors."]]],
    listening: "It's raining this morning, so my family is staying indoors. My father is reading and my mother is making tea. I am playing chess with my sister. We usually go cycling on Sundays, but we can't cycle in this weather. The forecast says it will be sunny this afternoon, so we can take photos in the park later.",
    gist: ["Why is the family indoors?",["It is raining","It is very late","They are working"],0], detail: ["What may they do later?",["Go shopping","Take photos","Watch a film"],1],
    reading: ["Today it is ","cloudy"," but warm. Mia likes ","cycling"," in the park. Her brother can't ride a bike, so he is ","playing"," chess indoors."],
    speaking: ["What do you enjoy doing in your free time?","What can you do well?","What are people doing today?"], sample: "I enjoy reading and taking photos. I can play chess, but I can't swim very well. Today it is sunny, so my friends are playing football outdoors.",
    writing: "Write about your favourite free-time activities and today's weather.", grammarCheck: ["Look! They ___ football now.",["play","are playing","playing"],1]
  },
  {
    id: "travel-transport-01", level: "A2", title: "Travel & Transport", icon: "train", subtitle: "Explain journeys, delays and travel choices",
    vocab: [["platform","the place where passengers wait for a train","sân ga"],["delay","a period of waiting","sự trì hoãn"],["cancelled","stopped before it happens","bị hủy"],["return ticket","a ticket for going and coming back","vé khứ hồi"],["traffic jam","many vehicles moving very slowly","tắc đường"],["miss a connection","arrive too late for the next service","lỡ chuyến nối"],["set off","begin a journey","khởi hành"],["on time","at the planned time","đúng giờ"]],
    grammar: [["Past continuous","was/were + verb-ing for background",["We were waiting on platform three.","It was raining heavily."]],["Past simple interruption","past simple for the event that happened",["The announcement suddenly changed.","Our bus arrived late."]],["Adverbs of manner","adjective + -ly describes how",["The train moved slowly.","She explained the route clearly."]]],
    listening: "We were travelling to Manchester when our train suddenly stopped outside Birmingham. At first, nobody knew what was happening. After twenty minutes, the driver explained that heavy rain had damaged a signal. We were moving again slowly when another announcement told us to change trains. We missed our connection, but a station employee calmly arranged new tickets. We finally arrived two hours late.",
    gist: ["What happened during the journey?",["The travellers got lost in a city","A signal problem caused delays","They chose the wrong airport"],1], detail: ["Who arranged new tickets?",["The driver","A station employee","Another passenger"],1],
    reading: ["We ","were waiting"," for the bus when a message arrived. The service was ","cancelled"," because of snow, so we travelled by train ","instead","."],
    speaking: ["Describe a journey that did not go as planned.","What happened first?","How was the problem solved?"], sample: "Last month, I was travelling home when my bus broke down. We waited for thirty minutes. Then the driver arranged another bus, and I arrived about an hour late.",
    writing: "Write an email explaining a travel delay and what happened.", grammarCheck: ["We ___ for the train when the announcement changed.",["waited","were waiting","are waiting"],1]
  },
  {
    id: "work-study-routines-01", level: "A2", title: "Work & Study Routines", icon: "school", subtitle: "Discuss responsibilities and activities over time",
    vocab: [["assignment","a task given for study","bài tập"],["shift","a scheduled period of work","ca làm việc"],["deadline","the final time for completing work","hạn chót"],["colleague","a person you work with","đồng nghiệp"],["attend a course","go regularly to lessons","tham gia khóa học"],["take notes","write important information","ghi chú"],["hand in","give completed work to a teacher","nộp bài"],["revise","study again before a test","ôn tập"]],
    grammar: [["Present perfect with for/since","have/has + past participle + duration/start",["I have worked here for two years.","She has studied since September."]],["Must and have to","obligation and external rules",["You must submit the form.","I have to work on Friday."]],["Don't have to / mustn't","no necessity versus prohibition",["You don't have to come early.","You mustn't copy answers."]]],
    listening: "I've attended an evening design course since September. I work during the day, so I have to study after dinner. We must hand in an assignment every two weeks, but we don't have to attend class on Fridays. This month has been busy because my colleague is away and I have worked extra shifts. I haven't missed a deadline yet, although I have had to plan my time carefully.",
    gist: ["What challenge does the speaker describe?",["Combining work and study","Finding a new home","Learning to drive"],0], detail: ["How often is an assignment due?",["Every week","Every two weeks","Every month"],1],
    reading: ["Lena has studied here ","since"," January. She has worked part-time ","for"," six months. Students must ","hand in"," their assignments online."],
    speaking: ["Describe your work or study routine.","What responsibilities do you have?","How long have you followed this routine?"], sample: "I have studied English for one year. I attend class twice a week and have to complete homework online. I must practise regularly, but I don't have to study at the same time every day.",
    writing: "Write about your work or study routine, responsibilities and duration.", grammarCheck: ["She has worked here ___ 2024.",["for","since","during"],1]
  },
  {
    id: "relationships-communication-01", level: "A2", title: "Relationships & Communication", icon: "forum", subtitle: "Describe people, communication habits and social situations",
    vocab: [["get along","have a friendly relationship","hòa hợp"],["keep in touch","continue communicating","giữ liên lạc"],["have an argument","disagree angrily","tranh cãi"],["apologise","say that you are sorry","xin lỗi"],["supportive","giving help and encouragement","biết hỗ trợ"],["honest","telling the truth","trung thực"],["message","send written information","nhắn tin"],["relationship","the connection between people","mối quan hệ"]],
    grammar: [["Defining relative clauses","who for people; which/that for things",["A friend is someone who supports you.","This is the message that I sent."]],["Verb + -ing","enjoy, avoid, finish + verb-ing",["We enjoy talking together.","He avoids discussing money."]],["Too and enough","too + adjective; adjective + enough",["The message was too short.","She was calm enough to listen."]]],
    listening: "My closest friend is someone who lives in another city. We enjoy sending voice messages because they feel more personal than short texts. Last week, we had an argument about a plan that changed at the last minute. I was too annoyed to listen properly. Later, I realised she had a good reason, so I apologised. We are close enough to discuss problems honestly, and that helps us keep in touch.",
    gist: ["What is the talk mainly about?",["Repairing a friendship after an argument","Choosing a messaging app","Moving to another city"],0], detail: ["Why do the friends like voice messages?",["They are cheaper","They feel more personal","They are shorter"],1],
    reading: ["A supportive friend is someone ","who"," listens carefully. Good friends enjoy ","sharing"," ideas and are honest ","enough"," to discuss problems."],
    speaking: ["Describe a person you communicate with often.","How do you keep in touch?","What makes communication effective?"], sample: "My best friend is someone who listens carefully. We enjoy talking after work and keep in touch by message. We are honest enough to solve small disagreements quickly.",
    writing: "Write a message explaining a misunderstanding and suggesting how to solve it.", grammarCheck: ["A colleague is a person ___ works with you.",["which","who","where"],1]
  },
  {
    id: "money-consumer-choices-01", level: "B1", title: "Money & Consumer Choices", icon: "payments", subtitle: "Evaluate purchases, budgets and consumer decisions",
    vocab: [["afford","have enough money for something","có khả năng chi trả"],["budget","a plan for spending money","ngân sách"],["value for money","good quality for the price","đáng tiền"],["refund","money returned after a purchase","hoàn tiền"],["subscription","regular payment for a service","gói đăng ký"],["impulse purchase","something bought without planning","mua bốc đồng"],["compare prices","check costs from different sellers","so sánh giá"],["consumer rights","legal protections for buyers","quyền người tiêu dùng"]],
    grammar: [["Modal deduction","must, might, can't + base form",["The offer must be genuine.","There might be an extra fee."]],["Quantifiers","few/little, fewer/less, enough",["I have little money left.","This plan has fewer charges."]],["Zero conditional","if + present, present for general results",["If you miss a payment, the service stops.","If prices rise, people compare more carefully."]]],
    listening: "A low monthly price might look attractive, but it can't be the only detail you check. Some subscriptions renew automatically and include fees that appear only after a trial period. If consumers compare the total annual cost, they often make a different choice. A service with fewer features may actually offer better value for money. Before paying, check the cancellation rules and whether you can receive a refund. The cheapest option must not be assumed to be the best one.",
    gist: ["What is the speaker advising consumers to do?",["Always choose the lowest monthly price","Compare full costs and conditions","Avoid every subscription"],1], detail: ["What may happen after a trial?",["Extra fees may appear","The price always falls","A refund is automatic"],0],
    reading: ["If shoppers ","compare"," the full cost, they make better choices. A cheap product might have ","fewer"," features, while a reliable item can offer better ","value"," for money."],
    speaking: ["Describe a purchase you considered carefully.","What influenced your decision?","How can consumers avoid poor choices?"], sample: "I recently compared two phone plans. The cheaper one had fewer benefits and might have included extra fees. I chose the clearer plan because it offered better value for money and flexible cancellation.",
    writing: "Write a review comparing two products or services and recommend one.", grammarCheck: ["If a trial ends, the subscription often ___ automatically.",["renews","renewed","will renewing"],0]
  },
  {
    id: "environment-community-01", level: "B1", title: "Environment & Community", icon: "eco", subtitle: "Discuss local action, causes and practical change",
    vocab: [["recycle","process material so it can be used again","tái chế"],["waste reduction","creating less rubbish","giảm rác thải"],["public transport","shared buses, trains and similar services","giao thông công cộng"],["green space","an area with plants in a town","không gian xanh"],["local initiative","a community action or project","sáng kiến địa phương"],["raise awareness","help people understand an issue","nâng cao nhận thức"],["energy efficient","using less energy","tiết kiệm năng lượng"],["take action","do something to address a problem","hành động"]],
    grammar: [["Passive across tenses","be + past participle",["Glass is recycled locally.","The park was improved last year."]],["Relative clauses","who, which, that, where",["Volunteers who joined received training.","The centre where we meet is accessible."]],["Purpose clauses","to, so that, in order to",["We planted trees to create shade.","Signs were added so that people could sort waste."]]],
    listening: "Our neighbourhood recycling project was started by six volunteers last spring. At first, only paper and glass were collected. After residents who used the service completed a survey, food-waste bins were added so that less rubbish would be sent to landfill. Clear signs were designed by local students, and monthly workshops are now held at the community centre. The project has not solved every problem, but recycling rates have doubled and more residents are asking how they can take action.",
    gist: ["What is the main achievement described?",["A local recycling project expanded and increased participation","A park was permanently closed","Students stopped attending workshops"],0], detail: ["Why were food-waste bins added?",["To collect paper","To reduce landfill waste","To advertise the centre"],1],
    reading: ["The project was ","started"," by local volunteers. Bins were added so that waste could be ","recycled",". Residents who joined helped ","raise"," awareness."],
    speaking: ["Describe an environmental issue in your area.","What has been done about it?","What further action would help?"], sample: "Traffic is a major issue where I live. New bus routes were introduced last year to reduce car use. People who travel at busy times now have more options, but safer cycle paths are still needed.",
    writing: "Write to a community group proposing an environmental improvement.", grammarCheck: ["The new recycling bins ___ last month.",["installed","were installed","are installing"],1]
  },
  {
    id: "culture-entertainment-01", level: "B1", title: "Culture & Entertainment", icon: "theater_comedy", subtitle: "Discuss changing tastes, reviews and cultural experiences",
    vocab: [["performance","an event where people entertain an audience","buổi biểu diễn"],["audience","people watching or listening","khán giả"],["plot","the main events in a story","cốt truyện"],["review","an opinion and evaluation","bài đánh giá"],["recommend","suggest that something is good","đề xuất"],["live music","music performed in front of an audience","nhạc sống"],["take part","participate in an activity","tham gia"],["cultural event","a public arts or traditions activity","sự kiện văn hóa"]],
    grammar: [["Reported speech","backshift after said/told",["She said the show was excellent.","He told me he had booked tickets."]],["Present perfect continuous","have/has been + verb-ing",["They have been performing for an hour.","I have been reading reviews."]],["Used to","past states and repeated habits",["I used to watch films at home.","The hall used to be a factory."]]],
    listening: "I've been attending the Riverside Festival since I moved here three years ago. The old theatre used to be an empty factory, but it has become the festival's main venue. This year, a friend told me that the opening performance was worth seeing, so I booked a ticket. The plot was simple, yet the actors involved the audience in surprising ways. Afterwards, several people said they had never enjoyed experimental theatre before. Events like this have been changing how local residents think about the arts.",
    gist: ["How has the festival affected the community?",["It has encouraged new interest in the arts","It has replaced every cinema","It has reduced the local audience"],0], detail: ["What did the theatre building use to be?",["A school","A factory","A station"],1],
    reading: ["The reviewer said the ","performance"," had been excellent. The company has been ","performing"," locally for years, and the venue used to be a ","factory","."],
    speaking: ["Describe a film, performance or cultural event.","What did someone tell you about it?","How have your tastes changed?"], sample: "I recently saw a play that a friend had recommended. She said the acting was excellent. I used to prefer films, but I have been attending more live performances this year.",
    writing: "Write a review of a cultural event and explain whether you recommend it.", grammarCheck: ["He said the performance ___ excellent.",["is","was","has"],1]
  }
];

const iconFor = term => /travel|platform|ticket|transport/.test(term) ? "directions_transit" : /money|price|budget|refund/.test(term) ? "payments" : "school";
const wordLimits = { A1: [35,55], A2: [60,90], B1: [100,140] };

function lesson(spec) {
  const [minWords,maxWords] = wordLimits[spec.level];
  const blanks = spec.reading.filter((_, index) => index % 2 === 1);
  const parts = spec.reading.map((part,index) => index % 2 ? { blank: `r${(index+1)/2}` } : part);
  return {
    id: spec.id, title: spec.title, level: spec.level, subtitle: spec.subtitle, themeIcon: spec.icon,
    sections: [
      { id:"overview", type:"intro", nav:"intro", eyebrow:`${spec.level} Core Module`, title:spec.title, quote:spec.subtitle,
        features:[{icon:"spellcheck",title:"Language Core",description:"Build accurate grammar and useful topic vocabulary."},{icon:"headphones",title:"Four Skills",description:"Practise real-life listening, reading, speaking and writing."},{icon:"task_alt",title:"Aptis Practice",description:"Check understanding with focused questions and a checkpoint."}],
        image:{src:"https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80",alt:`Learning theme for ${spec.title}`},
        tip:{title:"Learning Goal",text:spec.subtitle} },
      { id:"vocabulary", type:"vocabulary", nav:"vocabulary", eyebrow:"Vocabulary", title:`Topic Vocabulary: ${spec.title}`, description:"Learn each item as a complete meaning-and-use unit.",
        cards:spec.vocab.map(([term,definition,translation],index)=>({term,definition,translation,icon:iconFor(term),category:spec.title,badge:index<4?"Essential":"Useful",variant:index%3===1?"highlight":"default"})),
        tip:{title:"Vocabulary Strategy",text:"Say each item aloud, notice its common partners and use it in a personal sentence."} },
      { id:"grammar", type:"grammar", nav:"grammar", eyebrow:"Grammar", title:"Grammar for Clear Communication", description:"Study the form, meaning and use before completing the skills tasks.",
        points:spec.grammar.map(([title,func,examples],index)=>({title,icon:["rule","schema","edit_note"][index],function:func,examples})),
        tip:{title:"Accuracy Tip",text:"Choose grammar from the meaning you need, then check the verb form and subject."} },
      { id:"listening", type:"listening", nav:"listening", eyebrow:"Listening", title:`Listening: ${spec.title}`, description:"Listen once for gist and again for detail.",
        audio:{src:`/audio/${spec.id}.mp3?v=1`,transcript:spec.listening,highlights:spec.vocab.slice(0,4).map(item=>item[0])},
        gistQuestions:[{id:"listen-gist",prompt:spec.gist[0],options:spec.gist[1],correct:spec.gist[2],explanation:"The complete recording supports this main idea."}],
        detailQuestions:[{id:"listen-detail",prompt:spec.detail[0],options:spec.detail[1],correct:spec.detail[2],explanation:"This detail is stated in the recording."}],
        tip:{title:"Listening Strategy",text:"Use the first listen for context and the second listen to confirm exact details."} },
      { id:"reading", type:"reading", nav:"reading", eyebrow:"Reading", title:`Reading: ${spec.title}`, description:"Complete the text, then answer the comprehension question.",
        passage:{title:spec.title,parts,options:[...blanks,...spec.vocab.slice(0,3).map(item=>item[0])],blanks:blanks.map((correct,index)=>({id:`r${index+1}`,correct}))},
        questions:[{id:"read-main",prompt:"What is the text mainly demonstrating?",options:[`Language for ${spec.title}`,"A scientific formula","An unrelated historical date"],correct:0,explanation:"The text uses the module grammar and vocabulary in context."}],
        tip:{title:"Reading Strategy",text:"Read around each gap and check both meaning and grammar before choosing."} },
      { id:"speaking", type:"speaking", nav:"speaking", eyebrow:"Speaking", title:`Speaking: ${spec.title}`, description:"Prepare briefly, record your response and review it.", questions:spec.speaking,
        sampleAnswer:spec.sample, preparationSeconds:spec.level==="A1"?20:30, recordingSeconds:spec.level==="A1"?40:spec.level==="A2"?60:90,
        prompts:["Answer every part of the prompt.","Use the target grammar.","Add one reason or example."], tip:{title:"Speaking Tip",text:"Organise your answer into a clear beginning, two details and a short ending."} },
      { id:"writing", type:"writing", nav:"writing", eyebrow:"Writing", title:`Writing: ${spec.title}`, description:`Write ${minWords}-${maxWords} words using this module's language.`,
        prompt:{situation:spec.writing,placeholder:"Write your response here...",minWords,maxWords,referenceAnswer:spec.sample,focus:spec.grammar.map(item=>item[0])},
        tip:{title:"Writing Checklist",text:"Check task coverage, verb forms, vocabulary choice, spelling and word count."} },
      { id:"checkpoint", type:"checkpoint", nav:"exercise", eyebrow:"Checkpoint", title:"Module Checkpoint", description:"Check the key grammar and vocabulary before moving on.",
        questions:[{id:"check-grammar",prompt:spec.grammarCheck[0],options:spec.grammarCheck[1],correct:spec.grammarCheck[2],explanation:"This is the target grammar form from the module."},{id:"check-vocab",prompt:`Which item belongs to the topic ${spec.title}?`,options:[spec.vocab[0][0],"laboratory equation","ancient emperor"],correct:0,explanation:`${spec.vocab[0][0]} is core vocabulary in this module.`}],
        tip:{title:"Progress",text:"Review any incorrect answer, then record a final speaking response."} }
    ]
  };
}

for (const spec of specs) {
  const output = path.join(root,"data","topics",`${spec.id}.json`);
  await writeFile(output, JSON.stringify(lesson(spec),null,2)+"\n","utf8");
  console.log(`generated ${spec.level}: ${spec.id}`);
}
