import mongoose from "mongoose";

export async function connectDB(uri){
    try{
        await mongoose.connect(uri)
        .then(()=>{
            console.log("Connected to MongoDB");
        })
    }catch(err){
        console.log("Error connecting to MongoDB:", err);
        process.exit(1);
    }
}
