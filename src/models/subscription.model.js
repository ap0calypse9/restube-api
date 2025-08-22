import mongoose, {Schema} from "mongoose"

const subscriptionSchema = new Schema({
    subcriber: {
        type: Schema.Types.ObjectId, //one who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, //one to whom is subscribing
        ref: "User"
    }
}, {timestamps: true})


export const Subcription = mongoose.model("Subcription",
    subscriptionSchema
)