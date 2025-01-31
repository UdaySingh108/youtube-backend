import mongoose,{Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,//this is the user who is subscribing
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,//this is the user who is being subscribed to
        ref:"User"
    }
       
    },
    {
        timestamps:true
    })
export const subscription = mongoose.model("Subscription",subscriptionSchema)