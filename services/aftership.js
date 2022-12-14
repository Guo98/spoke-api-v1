function createAftershipCSV(customerInfo) {
  let csvRows = [
    "courier,tracking_number,email,title,customer_name,order_number,language",
  ];

  customerInfo.forEach((row) => {
    const csvRow = `,${row.tracking_number},${row.email},${row.title},${row.customer_name},${row.order_number},en`;
    csvRows.push(csvRow);
  });

  return customerInfo.length > 0 ? btoa(csvRows.join("\n")) : "";
}

export { createAftershipCSV };
