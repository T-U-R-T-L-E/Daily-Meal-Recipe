import { Request, Response } from "express";
import { paystackAPI } from "../utils/paystackApi";
import { asyncWrapper } from "../utils/asyncWrapper";
import { BadRequestError } from "../utils/apiError";
import { Donation } from "../models/donation.model";
import { StatusCodes } from "http-status-codes";

export class PaystackController {
  public initializePayment = asyncWrapper(
    async (req: Request, res: Response): Promise<Response> => {
      const { email, amount, callbackUrl, name } = req.body;

      if (!email || !amount) {
        throw new BadRequestError("Email and amount are required fields");
      }

      const paymentDetails = {
        amount,
        email,
        callback_url: callbackUrl,
        metadata: {
          amount,
          email,
          name: name || "Anonymous",
        },
      };

      const response = await paystackAPI.initializePayment(paymentDetails);

      return res.status(StatusCodes.OK).json({
        message: "payment initialized successful",
        data: response.data,
      });
    }
  );

  public verifyPayment = asyncWrapper(
    async (req: Request, res: Response): Promise<Response> => {
      const reference = req.query.reference as string;

      if (!reference) {
        throw new BadRequestError("missing transaction reference");
      }

      const responseData = await paystackAPI.verifyPayment(reference);
      
      const { status: transactionStatus, amount, metadata, customer } = responseData.data;

      if (transactionStatus !== "success") {
        throw new BadRequestError(`Transaction not successful: ${transactionStatus}`);
      }

      const name = metadata?.name || "Anonymous";
      const email = metadata?.email || customer?.email || "";

      const [donation, created] = await Donation.findOrCreate({
        where: { paymentReference: reference },
        defaults: {
          name,
          email,
          amount,
          paymentReference: reference,
        },
      });

      return res.status(StatusCodes.OK).json({
        message: "Payment verified and recorded successfully",
        donation,
        created,
      });
    }
  );
}

const payController = new PaystackController();
export default payController;
