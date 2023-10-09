import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {config} from 'dotenv';
import morgan from 'morgan';
import userRoutes from './routes/user.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';
config();



const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true }));

app.use(cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true
}))

app.use(cookieParser());  //jo cookies ka token hai usko pars krne ke liye helpful hoga

//jb koi baki /url pe jate hai to hme pta chl jayega user konse /url pe ja rh h 
app.use(morgan('dev'));
 
app.use('/ping', (req,res) => {
res.send('pong');
});

//routes of 3 module
app.use('/api/v1/user',userRoutes)

app.all('*',(req,res) => {
    res.status(404).send('Oops !! 404 Page not found')
})

app.use(errorMiddleware);

export default app;
