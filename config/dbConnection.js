import mongoose from "mongoose";

mongoose.set('strictQuery',false);  //agr extra info mangi h humne or server pe nhi hai to us info ko ignore krdena koi err mt dena
 
const connectionToDB = async()=>{

    try {
        const {connection} = await mongoose.connect(process.env.MONGODB_URI  )

   if(connection){
    console.log(`Connect to MongoDB: ${connection.host}`);
     }
    } catch (e) {
        console.log(e); 
        process.exit(1);
    }

};

export default connectionToDB;
