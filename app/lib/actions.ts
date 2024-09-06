"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FormSchema = z.object({
	id: z.string(),
	customerId: z.string(),
	amount: z.coerce.number(),
	status: z.enum(["pending", "paid"]),
	date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
	// validate form data using CreateInvoice schema from above
	// which uses InvoiceSchema and omits id, date
	const { customerId, amount, status } = CreateInvoice.parse({
		customerId: formData.get("customerId"),
		amount: formData.get("amount"),
		status: formData.get("status"),
	});
	// convert amount to cents for easier database storage
	const amountInCents = amount * 100;
	// create new date to be stored in database
	const date = new Date().toISOString().split("T")[0];

	// create sql statement to insert invoice into invoices table in database
	await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

	// clear cache and trigger new request to server
	revalidatePath("/dashboard/invoices");
	// redirect user to invoices page
	redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
	const { customerId, amount, status } = UpdateInvoice.parse({
		customerId: formData.get("customerId"),
		amount: formData.get("amount"),
		status: formData.get("status"),
	});

	const amountInCents = amount * 100;

	await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

	revalidatePath("/dashboard/invoices");
	redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
	await sql`DELETE FROM invoices WHERE id = ${id}`;
	revalidatePath("/dashboard/invoices");
}
