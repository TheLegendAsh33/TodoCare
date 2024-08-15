const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Todo = require('./models/Todo');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path')
const app = express();
const GraphData = require('./models/GraphData');

mongoose.connect('mongodb://localhost/todocare', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.set('view engine', 'ejs');
app.set('views',path.join(__dirname,'/views'))
app.use(express.static('public'));
app.use(express.static(path.join(__dirname,"/public/css")))
app.use(express.static(path.join(__dirname,"/public/js")))
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  const todos = await Todo.find({});
  res.render('index', { todos });
});

app.get('/about', async(req,res)=>{
  res.render('about')
})

app.get('/logsig', async(req,res)=>{
  res.render('logsig')
})

app.post('/add', async (req, res) => {
  const { task } = req.body;
  await Todo.create({ task });
  res.redirect('/');
});

app.post('/complete/:id', async (req, res) => {
  const { id } = req.params;
  await Todo.findByIdAndUpdate(id, { completed: true });
  res.redirect('/');
});

app.post('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Todo.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).send('Todo not found');
    }
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).send('Internal Server Error');
  }
});

  

app.get('/graph', async (req, res) => {
  const todos = await Todo.find({ completed: true });
  const data = todos.map(todo => ({
    task: todo.task,
    timeTaken: todo.timeTaken
  }));
  res.render('graph', { data });
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});

cron.schedule('0 0 * * *', async () => {
  try {
    const yesterdayTasks = await Todo.find({});
    await Todo.deleteMany({});
    console.log('All tasks from the previous day have been deleted.');
  } catch (error) {
    console.error('Error clearing daily tasks:', error);
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

const createPDF = (tasks, graphData, filePath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);
    doc.fontSize(20).text('Todo List & Progress Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).text('Todo Tasks:', { underline: true });
    doc.moveDown();

    tasks.forEach((task, index) => {
      doc.fontSize(12).text(`${index + 1}. Task: ${task.task}`);
      doc.text(`   Created At: ${task.createdAt}`);
      doc.text(`   Time Taken: ${task.timeTaken} minutes`);
      doc.moveDown();
    });

    doc.addPage();
    doc.fontSize(16).text('Graph Data:', { underline: true });
    doc.moveDown();

    graphData.forEach((dataPoint, index) => {
      doc.fontSize(12).text(`${index + 1}. Task: ${dataPoint.task}`);
      doc.text(`   Time Taken: ${dataPoint.timeTaken} minutes`);
      doc.text(`   Date: ${dataPoint.date}`);
      doc.moveDown();
    });

    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
};


const sendEmailWithAttachment = async (filePath) => {
  try {
    await transporter.sendMail({
      from: 'ashishinde2019@gmail.com',
      to: 'ashshinde1279@gmail.com',
      subject: 'Daily Todo Report',
      text: 'Please find the attached PDF for your daily todo report.',
      attachments: [
        {
          filename: 'todo-report.pdf',
          path: filePath
        }
      ]
    });

    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

cron.schedule('0 0 * * *', async () => {
  try {
    const tasks = await Todo.find({});

    if (tasks.length > 0) {
      const filePath = './todocare_report.pdf';
      
      await createPDF(tasks, filePath);

      await sendEmailWithAttachment(filePath);
      fs.unlinkSync(filePath);

      await Todo.deleteMany({});
      console.log('All tasks from the previous day have been deleted.');
    }
  } catch (error) {
    console.error('Error during daily cleanup:', error);
  }
});


const saveGraphData = async (task, timeTaken) => {
  const graphData = new GraphData({
    task: task,
    timeTaken: timeTaken,
    date: new Date() 
  });

  try {
    await graphData.save();
    console.log('Graph data saved successfully');
  } catch (error) {
    console.error('Error saving graph data:', error);
  }
};


saveGraphData('Example Task', 45); 

cron.schedule('0 0 * * *', async () => {
  try {
    const tasks = await Todo.find({});
    const graphData = await GraphData.find({});

    if (tasks.length > 0 || graphData.length > 0) {
      const filePath = './todocare_report.pdf';
      
      await createPDF(tasks, graphData, filePath);


      await sendEmailWithAttachment(filePath);

      fs.unlinkSync(filePath);


      await Todo.deleteMany({});
      await GraphData.deleteMany({});
      console.log('All tasks and graph data from the previous day have been deleted.');
    }
  } catch (error) {
    console.error('Error during daily cleanup:', error);
  }
});