const errorMiddleware = (err, req, res, next) =>{
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Some thing went wrong!!";

 return  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    stack: err.stack
})
};

// app.use(errorMiddleware);
// export default app;
export default errorMiddleware;